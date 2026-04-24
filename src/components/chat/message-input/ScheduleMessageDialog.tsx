import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@evoapi/design-system';
import { CalendarClock, Paperclip } from 'lucide-react';
import api from '@/services/core/api';

interface ScheduleMessageDialogProps {
  conversationId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  initialFiles?: File[];
  onScheduled?: () => void;
}

// Converts a local datetime-input value (YYYY-MM-DDTHH:mm) into an ISO
// string the backend can parse regardless of the user's timezone quirks.
function toIsoString(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

// Formats a Date for an <input type="datetime-local"> field. These inputs
// are local-time naive: passing an ISO string (UTC) would show the wrong
// wall-clock time for anyone not in UTC. Build the value from the date's
// local getters instead.
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function ScheduleMessageDialog({
  conversationId,
  open,
  onOpenChange,
  initialContent = '',
  initialFiles = [],
  onScheduled,
}: ScheduleMessageDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [when, setWhen] = useState<string>(() => {
    // Default to 1 hour from now, rounded to the next 5 min so the picker
    // is immediately usable without the user having to edit seconds.
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    return toDatetimeLocalValue(now);
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setContent(initialContent);
      setFiles(initialFiles);
    }
  }, [open, initialContent, initialFiles]);

  const handleSave = async () => {
    const iso = toIsoString(when);
    if (!iso) {
      toast.error('Data/hora inválida.');
      return;
    }
    if (!content.trim() && files.length === 0) {
      toast.error('Adicione um texto ou anexo.');
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append('content', content);
      form.append('scheduled_at', iso);
      files.forEach(file => form.append('attachments[]', file));

      await api.post(`/conversations/${conversationId}/scheduled_messages`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Mensagem agendada.');
      onScheduled?.();
      onOpenChange(false);
    } catch (err) {
      // Surface backend validation errors directly so the user knows why
      // (e.g. "scheduled_at deve estar no futuro" vs generic "Falha").
      const data = (err as {
        response?: { data?: { message?: string; data?: { details?: string } } };
      })?.response?.data;
      const msg = data?.data?.details || data?.message || 'Falha ao agendar mensagem.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Agendar mensagem
          </DialogTitle>
          <DialogDescription>
            A mensagem será enviada automaticamente na data e hora escolhidas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="schedule-when">Enviar em</Label>
            <Input
              id="schedule-when"
              type="datetime-local"
              value={when}
              onChange={e => setWhen(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-content">Mensagem</Label>
            <Textarea
              id="schedule-content"
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Texto da mensagem agendada"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-files" className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Anexos (opcional)
            </Label>
            <input
              id="schedule-files"
              type="file"
              multiple
              onChange={e => setFiles(Array.from(e.target.files || []))}
              disabled={saving}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-border file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {files.length} arquivo(s) anexado(s)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleMessageDialog;
