import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@evoapi/design-system/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@evoapi/design-system/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system/dialog';
import {
  Archive,
  ArchiveRestore,
  CheckCircle,
  ChevronDown,
  Clock,
  Loader2,
  MessageCircle,
  Pause,
  Tag,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { conversationAPI } from '@/services/conversations/conversationService';
import { chatService } from '@/services/chat/chatService';
import { labelsService } from '@/services/contacts/labelsService';
import usersService from '@/services/users/usersService';
import { runBulkConcurrent } from '@/utils/chat/runBulkConcurrent';
import type { Conversation } from '@/types/chat/api';
import type { Label as LabelType } from '@/types/settings/labels';
import type { User } from '@/types/users';

import BulkActionDialog from './BulkActionDialog';

type ConversationStatus = 'open' | 'pending' | 'resolved' | 'snoozed';

const STATUS_OPTIONS: Array<{
  value: ConversationStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'open', label: 'Aberta', icon: MessageCircle },
  { value: 'pending', label: 'Pendente', icon: Clock },
  { value: 'resolved', label: 'Resolvida', icon: CheckCircle },
  { value: 'snoozed', label: 'Adiada', icon: Pause },
];

// Sub-picker exibido depois que o usuário escolhe a categoria de ação
// (etiqueta/agente/status). Em vez de tentar nested DropdownMenu (que não é
// suportado de forma simples no Radix wrapper local), abrimos um Dialog
// pequeno com a lista de opções pertinentes — UX consistente em mobile e
// desktop, e Radix gerencia portal/overlay corretamente.
type Picker =
  | { kind: 'add-label' }
  | { kind: 'remove-label' }
  | { kind: 'status' }
  | { kind: 'assign-agent' }
  | null;

interface BulkSelectionToolbarProps {
  selectedConversations: Conversation[];
  onClear: () => void;
  /** Recarrega a lista após uma ação para refletir mudanças no servidor */
  onAfterAction?: () => Promise<void> | void;
}

type PendingAction =
  | { kind: 'add-label'; label: LabelType }
  | { kind: 'remove-label'; label: LabelType }
  | { kind: 'status'; status: ConversationStatus; statusLabel: string }
  | { kind: 'assign-agent'; agent: User | null }
  | { kind: 'archive' }
  | { kind: 'unarchive' };

/**
 * BulkSelectionToolbar — barra que aparece acima da lista quando há ao menos
 * uma conversa selecionada. Mostra a contagem, o botão "Limpar" e um único
 * dropdown "Ações em massa" com opções (status, etiquetas, agente, arquivar).
 *
 * Para escolhas que precisam de uma lista (qual etiqueta? qual agente?), o
 * dropdown fecha e abre um Picker (Dialog) com as opções. Após o usuário
 * escolher, mostramos o BulkActionDialog de confirmação antes de aplicar.
 *
 * As listas de etiquetas/agentes são carregadas sob demanda (lazy) e
 * cacheadas em estado local — uma única chamada por sessão.
 */
const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = ({
  selectedConversations,
  onClear,
  onAfterAction,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);

  const [labels, setLabels] = useState<LabelType[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [running, setRunning] = useState(false);

  const count = selectedConversations.length;

  const ensureLabelsLoaded = useCallback(async () => {
    if (labels.length > 0 || labelsLoading) return;
    setLabelsLoading(true);
    try {
      const resp = await labelsService.getLabels();
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setLabels(list);
    } catch (err) {
      console.error('BulkSelectionToolbar: erro carregando etiquetas', err);
    } finally {
      setLabelsLoading(false);
    }
  }, [labels.length, labelsLoading]);

  const ensureAgentsLoaded = useCallback(async () => {
    if (agents.length > 0 || agentsLoading) return;
    setAgentsLoading(true);
    try {
      const resp = await usersService.getUsers({ per_page: 100 });
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setAgents(list);
    } catch (err) {
      console.error('BulkSelectionToolbar: erro carregando agentes', err);
    } finally {
      setAgentsLoading(false);
    }
  }, [agents.length, agentsLoading]);

  // Quando o picker de etiquetas/agentes abre pela primeira vez, dispara o
  // carregamento. Evita esperar o usuário hovera sem feedback.
  useEffect(() => {
    if (picker?.kind === 'add-label' || picker?.kind === 'remove-label') {
      void ensureLabelsLoaded();
    } else if (picker?.kind === 'assign-agent') {
      void ensureAgentsLoaded();
    }
  }, [picker, ensureLabelsLoaded, ensureAgentsLoaded]);

  const buildActionDescription = (action: PendingAction): string => {
    switch (action.kind) {
      case 'add-label':
        return `Adicionar etiqueta «${action.label.title}»`;
      case 'remove-label':
        return `Remover etiqueta «${action.label.title}»`;
      case 'status':
        return `Mudar status para ${action.statusLabel}`;
      case 'assign-agent':
        return action.agent
          ? `Atribuir para ${action.agent.name}`
          : 'Remover atribuição de agente';
      case 'archive':
        return 'Arquivar';
      case 'unarchive':
        return 'Desarquivar';
    }
  };

  const buildItemRunner = useCallback(
    (action: PendingAction): ((conversation: Conversation) => Promise<void>) => {
      switch (action.kind) {
        case 'add-label': {
          // Backend convenciona "replace all" pra labels — precisamos LER o
          // set atual antes de aplicar. Como o objeto Conversation já tem
          // `labels`, usamos sem round-trip extra.
          const targetTitle = action.label.title;
          return async (conversation: Conversation) => {
            const current = ((conversation.labels || []) as Array<
              { title?: string; name?: string } | string
            >)
              .map(l => (typeof l === 'string' ? l : String(l.title || l.name || '')))
              .filter(Boolean);
            if (current.includes(targetTitle)) return;
            const next = [...current, targetTitle];
            await conversationAPI.addLabels(String(conversation.id), next);
          };
        }
        case 'remove-label': {
          const targetTitle = action.label.title;
          return async (conversation: Conversation) => {
            const current = ((conversation.labels || []) as Array<
              { title?: string; name?: string } | string
            >)
              .map(l => (typeof l === 'string' ? l : String(l.title || l.name || '')))
              .filter(Boolean);
            if (!current.includes(targetTitle)) return;
            const next = current.filter(t => t !== targetTitle);
            await conversationAPI.addLabels(String(conversation.id), next);
          };
        }
        case 'status': {
          // Chamamos chatService direto (não o context.updateConversationStatus)
          // porque o método do context dispara um toast por conversa — em modo
          // bulk queremos UM toast no final, com a contagem agregada.
          const status = action.status;
          return async (conversation: Conversation) => {
            await chatService.updateConversationStatus(String(conversation.id), status);
          };
        }
        case 'assign-agent': {
          const agentId = action.agent ? String(action.agent.id) : null;
          return async (conversation: Conversation) => {
            await conversationAPI.assignConversation(String(conversation.id), agentId);
          };
        }
        case 'archive': {
          return async (conversation: Conversation) => {
            await chatService.archiveConversation(String(conversation.id));
          };
        }
        case 'unarchive': {
          return async (conversation: Conversation) => {
            await chatService.unarchiveConversation(String(conversation.id));
          };
        }
      }
    },
    [],
  );

  const executePending = useCallback(async () => {
    if (!pending) return;
    setRunning(true);
    const runner = buildItemRunner(pending);
    try {
      const { succeeded, failed } = await runBulkConcurrent(
        selectedConversations,
        runner,
        5,
      );
      if (failed.length === 0) {
        toast.success(`Ação concluída em ${succeeded.length} conversas`);
      } else if (succeeded.length === 0) {
        toast.error(`Falha ao aplicar ação em ${failed.length} conversas`);
      } else {
        toast.warning(
          `Concluído em ${succeeded.length} de ${succeeded.length + failed.length}. ${failed.length} falharam.`,
        );
      }
      if (onAfterAction) {
        await onAfterAction();
      }
      // Importante: zerar `running` e `pending` ANTES de `onClear()` —
      // `onClear` faz `exitMode` no parent, o que esconde a toolbar e
      // desmonta este componente. Setar state após desmontar dispara
      // warning do React.
      setRunning(false);
      setPending(null);
      onClear();
    } catch (err) {
      console.error('BulkSelectionToolbar: erro inesperado', err);
      toast.error('Erro ao executar ação em massa');
      setRunning(false);
    }
  }, [pending, buildItemRunner, selectedConversations, onAfterAction, onClear]);

  const closePicker = () => setPicker(null);

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {count} {count === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs cursor-pointer"
            onClick={onClear}
            aria-label="Limpar seleção"
          >
            Limpar
          </Button>
        </div>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 cursor-pointer"
              disabled={count === 0}
            >
              Ações em massa
              <ChevronDown className="h-3.5 w-3.5 ml-1" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Ações
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setPicker({ kind: 'status' });
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              Mudar status
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setPicker({ kind: 'add-label' });
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Tag className="h-4 w-4" />
              Adicionar etiqueta
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setPicker({ kind: 'remove-label' });
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Tag className="h-4 w-4 text-muted-foreground" />
              Remover etiqueta
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setPicker({ kind: 'assign-agent' });
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Atribuir agente
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setPending({ kind: 'archive' });
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Archive className="h-4 w-4" />
              Arquivar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setPending({ kind: 'unarchive' });
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <ArchiveRestore className="h-4 w-4" />
              Desarquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Picker — dialog leve com a lista da categoria escolhida. Selecionar
          uma opção fecha o picker e abre o BulkActionDialog de confirmação. */}
      <Dialog
        open={picker !== null}
        onOpenChange={open => {
          if (!open) closePicker();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {picker?.kind === 'status' && 'Selecionar novo status'}
              {picker?.kind === 'add-label' && 'Adicionar etiqueta'}
              {picker?.kind === 'remove-label' && 'Remover etiqueta'}
              {picker?.kind === 'assign-agent' && 'Atribuir agente'}
            </DialogTitle>
            <DialogDescription>
              Escolha a opção para aplicar nas {count} conversas selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto -mx-6 px-6">
            {picker?.kind === 'status' && (
              <div className="flex flex-col gap-1">
                {STATUS_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        closePicker();
                        setPending({
                          kind: 'status',
                          status: opt.value,
                          statusLabel: opt.label,
                        });
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {(picker?.kind === 'add-label' || picker?.kind === 'remove-label') && (() => {
              // Captura `kind` no escopo do render — evita que o TS perca o
              // narrowing dentro do callback (e evita `picker` virar null
              // antes do click resolver).
              const kind: 'add-label' | 'remove-label' = picker.kind;
              return (
                <div className="flex flex-col gap-1">
                  {labelsLoading && (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Carregando etiquetas
                    </div>
                  )}
                  {!labelsLoading && labels.length === 0 && (
                    <div className="text-sm text-muted-foreground py-6 text-center italic">
                      Nenhuma etiqueta cadastrada. Crie etiquetas em Configurações.
                    </div>
                  )}
                  {!labelsLoading &&
                    labels.map(label => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => {
                          closePicker();
                          setPending({ kind, label });
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color || '#1f93ff' }}
                          aria-hidden
                        />
                        <span className="truncate">{label.title}</span>
                      </button>
                    ))}
                </div>
              );
            })()}

            {picker?.kind === 'assign-agent' && (
              <div className="flex flex-col gap-1">
                {agentsLoading && (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Carregando agentes
                  </div>
                )}
                {!agentsLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      closePicker();
                      setPending({ kind: 'assign-agent', agent: null });
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left italic text-muted-foreground"
                  >
                    <X className="h-4 w-4" /> Remover atribuição
                  </button>
                )}
                {!agentsLoading && agents.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center italic">
                    Nenhum agente disponível.
                  </div>
                )}
                {!agentsLoading &&
                  agents.map(agent => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        closePicker();
                        setPending({ kind: 'assign-agent', agent });
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left"
                    >
                      <span className="truncate">{agent.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={closePicker}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkActionDialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open && !running) setPending(null);
        }}
        actionDescription={pending ? buildActionDescription(pending) : ''}
        count={count}
        onConfirm={executePending}
        isLoading={running}
      />
    </>
  );
};

export default BulkSelectionToolbar;
