import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tag as TagIcon, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@evoapi/design-system/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system/popover';
import { labelsService } from '@/services/contacts/labelsService';
import { useConversations } from '@/hooks/chat/useConversations';
import { Conversation } from '@/types/chat/api';
import { toast } from 'sonner';

interface LabelOption {
  id: string;
  title: string;
  color?: string;
}

interface ConversationLabelsProps {
  conversation: Conversation;
  onChange?: () => void;
}

// Shows all labels assigned to the conversation with an X to remove,
// and a "+" popover to add more from the account catalog. Saves inline
// (replaces the whole label set on every change — backend convention).
const ConversationLabels: React.FC<ConversationLabelsProps> = ({ conversation, onChange }) => {
  const { assignLabels } = useConversations();
  const [available, setAvailable] = useState<LabelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const current: LabelOption[] = useMemo(() => {
    return ((conversation.labels || []) as unknown as Array<{ id?: string; title?: string; name?: string; color?: string } | string>)
      .map(l => {
        if (typeof l === 'string') return { id: l, title: l };
        return {
          id: String(l.id || l.title || l.name || ''),
          title: String(l.title || l.name || ''),
          color: l.color
        };
      })
      .filter(l => l.id && l.title);
  }, [conversation.labels]);

  const loadAvailable = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await labelsService.getLabels();
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setAvailable(list.map((l: any) => ({ id: String(l.id || l.title), title: String(l.title || l.name || ''), color: l.color })));
    } catch (err) {
      console.error('ConversationLabels: load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (popoverOpen && available.length === 0) loadAvailable();
  }, [popoverOpen, available.length, loadAvailable]);

  const save = async (nextTitles: string[]) => {
    try {
      await assignLabels(String(conversation.id), nextTitles);
      onChange?.();
    } catch (err) {
      console.error('ConversationLabels: save error', err);
      toast.error('Erro ao atualizar etiquetas');
    }
  };

  const handleRemove = async (label: LabelOption) => {
    setSaving(label.id);
    const next = current.filter(l => l.id !== label.id).map(l => l.title);
    await save(next);
    setSaving(null);
  };

  const handleAdd = async (label: LabelOption) => {
    if (current.some(l => l.id === label.id || l.title === label.title)) return;
    setSaving(label.id);
    const next = [...current.map(l => l.title), label.title];
    await save(next);
    setSaving(null);
    setPopoverOpen(false);
  };

  const addable = available.filter(a => !current.some(c => c.id === a.id || c.title === a.title));

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {current.length === 0 && (
        <span className="text-xs text-muted-foreground italic">Sem etiquetas</span>
      )}

      {current.map(label => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: label.color || '#1f93ff' }}
        >
          <TagIcon className="h-2.5 w-2.5" />
          <span className="truncate max-w-[120px]">{label.title}</span>
          <button
            type="button"
            onClick={() => handleRemove(label)}
            disabled={saving === label.id}
            className="hover:bg-black/20 rounded-full p-0.5 -mr-1 disabled:opacity-50"
            title="Remover"
          >
            {saving === label.id ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <X className="h-2.5 w-2.5" />
            )}
          </button>
        </span>
      ))}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-5 px-1.5 text-[10px] rounded-full"
          >
            <Plus className="h-2.5 w-2.5 mr-0.5" />
            Adicionar
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1 max-h-60 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Carregando
            </div>
          )}
          {!loading && addable.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-2 text-center italic">
              {available.length === 0 ? 'Crie etiquetas em Configurações' : 'Todas já atribuídas'}
            </div>
          )}
          {!loading && addable.map(label => (
            <button
              key={label.id}
              type="button"
              onClick={() => handleAdd(label)}
              disabled={saving === label.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded disabled:opacity-50"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: label.color || '#1f93ff' }}
              />
              <span className="truncate">{label.title}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ConversationLabels;
