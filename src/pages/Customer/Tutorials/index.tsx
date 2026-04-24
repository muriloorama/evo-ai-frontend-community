import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@evoapi/design-system';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  validationChecklistService,
  type ChecklistRow,
} from '@/services/validationChecklistService';

// Visual validation checklist. State lives on the account (not the browser),
// so every agent sees the same ticks and who marked each item.
// Not a real test runner — just a shared "done" board.

type Item = {
  id: string;
  title: string;
  how: string; // short "como testar"
};

type Section = {
  title: string;
  emoji: string;
  items: Item[];
};

const CHECKLIST: Section[] = [
  {
    title: 'Chat e conversas',
    emoji: '💬',
    items: [
      {
        id: 'chat-lead-contato',
        title: 'Botão "Lead" renomeado para "Contato"',
        how: 'Abre uma conversa → botão no topo direito deve dizer "Contato".',
      },
      {
        id: 'chat-reply-p-tag',
        title: 'Mensagens não saem mais com <p>...</p>',
        how: 'Envie uma mensagem pro cliente. Não deve aparecer "<p>" bruto no WhatsApp dele.',
      },
      {
        id: 'chat-reply-preview',
        title: 'Preview de resposta sem HTML bruto',
        how: 'Toque em "Responder" numa mensagem — preview acima do input deve ser texto puro.',
      },
      {
        id: 'chat-incoming-color',
        title: 'Texto das mensagens recebidas legível',
        how: 'Verifica no tema atual: texto da outra pessoa e seu não confundem mais.',
      },
      {
        id: 'chat-reaction-send',
        title: 'Reagir com emoji (right-click) envia como REAÇÃO',
        how: 'Clique-direito numa msg do cliente → escolha 👍/❤️/😂/😮 → deve aparecer como reação (emoji sob a msg) no WhatsApp, não como mensagem de texto.',
      },
      {
        id: 'chat-reaction-incoming',
        title: 'Reação do cliente aparece no chat',
        how: 'Peça pro cliente reagir com emoji → deve aparecer como reação abaixo da mensagem original.',
      },
      {
        id: 'chat-multi-media',
        title: 'Várias mídias numa mensagem — todas entregues',
        how: 'Anexe 2-3 imagens e envie. Todas devem chegar no WhatsApp do cliente.',
      },
      {
        id: 'chat-template-send',
        title: 'Template (com variáveis + mídia) entrega pelo chat',
        how: 'No chat, envia um template aprovado → deve chegar completo no cliente.',
      },
      {
        id: 'chat-cloud-api-outgoing',
        title: 'Mensagens da caixa Cloud API chegam no cliente',
        how: 'Abre uma conversa do canal Cloud API (ex: ombro-amigo), manda qualquer texto.',
      },
      {
        id: 'chat-schedule',
        title: 'Agendador de mensagens (botão + → Agendar)',
        how: 'Botão "+" no input → "Agendar mensagem" → escolhe horário futuro → salva. Quando chegar a hora, é enviada automaticamente.',
      },
    ],
  },
  {
    title: 'Canais',
    emoji: '📞',
    items: [
      {
        id: 'channel-phone-badge',
        title: 'Badge do número do WhatsApp nos cards de canal',
        how: 'Acesse Canais → card mostra o número embaixo do nome.',
      },
      {
        id: 'channel-phone-sidebar',
        title: 'Número visível no header da conversa e dropdown de novo chat',
        how: 'No chat: nome (+número). Ao criar conversa, dropdown mostra o número ao lado.',
      },
      {
        id: 'channel-edit-cloud',
        title: 'Editar credenciais do Cloud API sem perder a caixa',
        how: 'Canal Cloud → aba Configuração → botão "Editar" em "Credenciais do WhatsApp Cloud" → edita phone_number_id/WABA_ID/API key/webhook → Salvar.',
      },
      {
        id: 'channel-webhook-api',
        title: 'Callback URL do webhook começa com api.',
        how: 'No mesmo card de credenciais, Callback URL deve ser https://api.seudominio/webhooks/whatsapp/...',
      },
      {
        id: 'channel-moderation-hidden',
        title: 'Aba Moderação escondida em canais não-Facebook/Instagram',
        how: 'No canal WhatsApp: aba Moderação não aparece.',
      },
      {
        id: 'channel-reconectar-button',
        title: 'Botão Reconectar some quando não há Embedded Signup',
        how: 'Sem wpAppId/wpWhatsappConfigId configurados: o botão Reconectar não deve aparecer.',
      },
    ],
  },
  {
    title: 'Contatos',
    emoji: '👤',
    items: [
      {
        id: 'contact-cpf-cnpj',
        title: 'CPF/CNPJ com máscara automática',
        how: 'Novo contato BR: digita até 11 dígitos → CPF (000.000.000-00). Continua digitando → CNPJ (00.000.000/0000-00). Label: "CPF/CNPJ".',
      },
      {
        id: 'contact-status-persist',
        title: 'Status do Contato persiste ao salvar',
        how: 'Edita contato → liga/desliga "Bloqueado" → salva. Reabre — estado mantido.',
      },
      {
        id: 'contact-blocked-drop-msg',
        title: 'Mensagens recebidas de contato bloqueado são descartadas',
        how: 'Bloqueia o contato → peça pra ele mandar mensagem. Não aparece no chat.',
      },
      {
        id: 'contact-custom-attrs',
        title: 'Atributos Personalizados salvam e persistem',
        how: 'Edita contato → adiciona/edita atributo → salva. Reabre — valor mantido.',
      },
      {
        id: 'contact-auto-location',
        title: 'Localização auto a partir do DDD/DDI',
        how: 'Novo contato +55 18 XXX → cidade "Presidente Prudente", país BR automaticamente.',
      },
      {
        id: 'contact-events-no-toast',
        title: 'Sem erro "Erro ao carregar estatísticas de eventos"',
        how: 'Abre perfil do contato → aba Eventos. Não aparece mais o toast vermelho.',
      },
      {
        id: 'contact-agent-scope',
        title: 'Agente só vê contatos das caixas em que é membro',
        how: 'Loga como agente com 1 caixa → lista de contatos só mostra quem tem conversa naquela caixa.',
      },
      {
        id: 'contact-realtime-edit',
        title: 'Edição de contato propaga em tempo real (sem F5)',
        how: 'Edita em uma aba → outra aba atualiza sozinha.',
      },
    ],
  },
  {
    title: 'Templates de mensagem',
    emoji: '📝',
    items: [
      {
        id: 'template-types',
        title: 'Tipo de Template exibe nome correto',
        how: 'Criar template → dropdown "Tipo" mostra "Texto/Interativo/Mídia" etc., sem chave crua.',
      },
      {
        id: 'template-header-optional',
        title: 'Cabeçalho opcional (NONE) e com upload de mídia',
        how: 'Criar template → Formato do Cabeçalho: "Sem cabeçalho", "Texto", "Imagem/Vídeo/Doc" — ao escolher mídia, aparece file picker.',
      },
      {
        id: 'template-var-example',
        title: 'Variáveis {{x}} no corpo pedem exemplo',
        how: 'No corpo: "Olá {{nome}}, seu pedido {{num}}" → aparece bloco de inputs pedindo exemplo pra cada variável.',
      },
      {
        id: 'template-buttons-limit',
        title: 'Botões limitados a 20 chars e sem emoji',
        how: 'Adiciona botão → Input bloqueia no 20º caractere. Emoji é removido automaticamente.',
      },
      {
        id: 'template-buttons-count',
        title: 'Aviso de limite de 3 botões',
        how: 'Adiciona 3 botões → 4ª tentativa mostra aviso.',
      },
    ],
  },
  {
    title: 'Login e cadastro',
    emoji: '🔐',
    items: [
      {
        id: 'auth-password-eye',
        title: 'Olhinho de senha no login',
        how: 'Tela de login → ícone 👁 ao lado da senha mostra/oculta.',
      },
      {
        id: 'auth-password-eye-register',
        title: 'Olhinho de senha no cadastro',
        how: 'Tela de cadastro → senha e confirmar senha têm ícone.',
      },
      {
        id: 'auth-password-eye-user',
        title: 'Olhinho no cadastro de atendente',
        how: 'Admin → Usuários → criar/editar → campos de senha com olhinho.',
      },
    ],
  },
  {
    title: 'Dashboard',
    emoji: '📊',
    items: [
      {
        id: 'dashboard-contact-type',
        title: 'Filtro por tipo de contato (Clientes convertidos)',
        how: 'Dashboard → Filtros → "Tipo de contato" → Clientes convertidos → aplica.',
      },
      {
        id: 'dashboard-map-br',
        title: 'Heatmap de contatos por estado BR',
        how: 'Dashboard → aba Visão geral → card "Contatos por estado (Brasil)" com grid colorido.',
      },
    ],
  },
  {
    title: 'Agente IA',
    emoji: '🤖',
    items: [
      {
        id: 'ai-hours',
        title: 'Horário de atividade IA configurado via bot_config',
        how: 'Configure `ai_active_hours` no bot_config → fora do horário, bot não responde.',
      },
      {
        id: 'ai-inactivity-hours',
        title: 'Horário permitido para mensagens de inatividade',
        how: 'Configure `inactivity_hours` → msgs "ainda tá aí?" não saem fora da janela.',
      },
      {
        id: 'ai-no-disclosure',
        title: 'Bot não admite ser IA',
        how: 'Prompts não dizem "sou uma IA".',
      },
    ],
  },
  {
    title: 'Campanhas / Disparador',
    emoji: '📣',
    items: [
      {
        id: 'broadcast-create',
        title: 'Criar campanha (rascunho)',
        how: '/broadcasts → Nova campanha → nome + canal + template + rate limit → salva como rascunho.',
      },
      {
        id: 'broadcast-recipients',
        title: 'Adicionar destinatários (UUIDs)',
        how: 'Clica "Adicionar destinatários" → cola IDs separados por vírgula/linha → adiciona.',
      },
      {
        id: 'broadcast-enqueue',
        title: 'Enfileirar campanha e rate limit funciona',
        how: 'Clica "Enviar" → status muda pra "Enviando" → barra de progresso atualiza. Respeita msg/min configurado.',
      },
      {
        id: 'broadcast-cancel',
        title: 'Cancelar campanha em andamento',
        how: 'Com campanha enviando → botão Cancelar → status "Cancelada", envios param.',
      },
    ],
  },
  {
    title: 'Simplificações internas (arquitetura)',
    emoji: '🔧',
    items: [
      {
        id: 'simp-contact-unified',
        title: 'Tipo Contact unificado (sem duplicação)',
        how: 'Código: import de @/types/contacts ou @/types/chat/api resolve pro mesmo tipo. Sem mais divergência de campos.',
      },
      {
        id: 'simp-single-source',
        title: 'Só conversation.contact como source-of-truth (meta.sender não é mais atualizado)',
        how: 'Reducer UPDATE_CONTACT_IN_CONVERSATIONS atualiza só conversation.contact.',
      },
      {
        id: 'simp-use-contact-update',
        title: 'Hook useContactUpdate centraliza PATCH → dispatch → toast',
        how: 'Cada componente que edita contato usa o mesmo hook.',
      },
      {
        id: 'simp-upload-unified',
        title: 'Fluxos de upload de avatar consolidados',
        how: 'Só updateContact; updateContactWithAvatar removido.',
      },
    ],
  },
];

const COLLAPSE_KEY = 'evo-crm-validation-checklist-collapsed-v1';

function loadCollapsed(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function Tutorials() {
  // Checked state shared across the account, keyed by item_key.
  const [checks, setChecks] = useState<Record<string, ChecklistRow>>({});
  const [loading, setLoading] = useState(true);
  // Per-item "in flight" map so we can disable a button while its toggle POST is running.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  // Section collapsed state is still local per-browser — it's just UI preference.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => loadCollapsed());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await validationChecklistService.list();
      const map: Record<string, ChecklistRow> = {};
      rows.forEach(row => {
        map[row.item_key] = row;
      });
      setChecks(map);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar checklist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll every 10s so checks made by other agents on the same account show
  // up without a manual refresh. Cheap GET, ~8 kB response.
  useEffect(() => {
    const interval = window.setInterval(() => {
      // Skip while a user has a toggle in flight — avoids racing the
      // optimistic update we just applied.
      if (Object.keys(pending).length > 0) return;
      validationChecklistService
        .list()
        .then(rows => {
          const map: Record<string, ChecklistRow> = {};
          rows.forEach(row => {
            map[row.item_key] = row;
          });
          setChecks(map);
        })
        .catch(() => {
          /* silent — next tick retries */
        });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [pending]);

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  const totals = useMemo(() => {
    const all = CHECKLIST.flatMap(section => section.items);
    const done = all.filter(item => checks[item.id]?.checked).length;
    return { done, total: all.length };
  }, [checks]);

  const toggle = async (id: string) => {
    const current = !!checks[id]?.checked;
    setPending(prev => ({ ...prev, [id]: true }));
    // Optimistic update — revert on failure.
    setChecks(prev => {
      if (current) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { item_key: id, checked: true } };
    });

    try {
      const row = await validationChecklistService.toggle(id, !current);
      setChecks(prev => ({ ...prev, [id]: row }));
    } catch (err) {
      console.error(err);
      toast.error('Falha ao atualizar item.');
      // Revert by reloading the truth from the server.
      load();
    } finally {
      setPending(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const toggleCollapsed = (sectionTitle: string) =>
    setCollapsed(prev => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));

  const setAllCollapsed = (value: boolean) => {
    const next: Record<string, boolean> = {};
    CHECKLIST.forEach(section => {
      next[section.title] = value;
    });
    setCollapsed(next);
  };

  const reset = async () => {
    if (!window.confirm('Desmarcar TODOS os itens (todos os agentes)?')) return;
    try {
      await validationChecklistService.reset();
      setChecks({});
      toast.success('Lista zerada.');
    } catch {
      toast.error('Falha ao zerar.');
    }
  };

  const progress = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Validação de entregas
          </h1>
          <p className="text-muted-foreground mt-1">
            Marque cada item conforme for validando no app. O progresso é compartilhado com todos
            os atendentes da conta.
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm text-muted-foreground">Progresso</div>
                <div className="text-2xl font-semibold">
                  {totals.done} / {totals.total}{' '}
                  <span className="text-sm font-normal text-muted-foreground">({progress}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setAllCollapsed(false)}>
                  Expandir todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllCollapsed(true)}>
                  Recolher todas
                </Button>
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Resetar
                </Button>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando checklist…
          </div>
        )}

        {!loading &&
          CHECKLIST.map(section => {
            const sectionDone = section.items.filter(item => checks[item.id]?.checked).length;
            const isCollapsed = !!collapsed[section.title];
            return (
              <Card key={section.title}>
                <CardHeader className="pb-2">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(section.title)}
                    className="w-full flex items-center justify-between group"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          isCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                      <span className="text-xl leading-none">{section.emoji}</span>
                      <span className="group-hover:text-primary transition-colors">
                        {section.title}
                      </span>
                    </CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {sectionDone}/{section.items.length}
                    </Badge>
                  </button>
                </CardHeader>
                {!isCollapsed && (
                  <CardContent className="space-y-2">
                    {section.items.map(item => {
                      const row = checks[item.id];
                      const isDone = !!row?.checked;
                      const inFlight = !!pending[item.id];
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          disabled={inFlight}
                          className={`w-full text-left p-3 rounded-lg border transition-colors disabled:opacity-60 ${
                            isDone
                              ? 'bg-primary/5 border-primary/40'
                              : 'bg-card border-border hover:bg-accent/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {inFlight ? (
                              <Loader2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5 animate-spin" />
                            ) : isDone ? (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm font-medium ${
                                  isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {item.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{item.how}</div>
                              {isDone && row?.checked_by?.name && (
                                <div className="text-xs text-primary/80 mt-1.5">
                                  ✓ por {row.checked_by.name}
                                  {row.checked_at && (
                                    <span className="text-muted-foreground">
                                      {' '}
                                      · {formatDate(row.checked_at)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
