import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system/button';
import { Textarea } from '@evoapi/design-system/textarea';
import { Loader2, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { contactsService } from '@/services/contacts/contactsService';
import type { ContactNote } from '@/types/contacts/contact';

interface ContactNotesProps {
  contactId: string;
}

// Compact notes editor for the lead sidebar. Lists existing notes
// newest-first, lets the operator add a new one, and delete own notes.
const ContactNotes: React.FC<ContactNotesProps> = ({ contactId }) => {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await contactsService.getContactNotes(contactId);
      // Backend returns a bare array; helper may or may not wrap it.
      const list = Array.isArray(resp) ? resp : (resp?.data as ContactNote[] | undefined) ?? [];
      setNotes(list);
    } catch (err) {
      console.error('Error loading contact notes:', err);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAdd = async () => {
    const content = newNote.trim();
    if (!content) return;
    setSaving(true);
    try {
      const created = await contactsService.createContactNote(contactId, content);
      setNotes(prev => [created, ...prev]);
      setNewNote('');
      toast.success('Nota adicionada');
    } catch (err) {
      console.error('Error creating note:', err);
      toast.error('Erro ao adicionar nota');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await contactsService.deleteContactNote(contactId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error('Erro ao remover nota');
    }
  };

  const startEdit = (note: ContactNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (noteId: string) => {
    const content = editContent.trim();
    if (!content) return;
    setUpdatingId(noteId);
    try {
      const updated = await contactsService.updateContactNote(contactId, noteId, content);
      setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
      toast.success('Nota atualizada');
      cancelEdit();
    } catch (err) {
      console.error('Error updating note:', err);
      toast.error('Erro ao atualizar nota');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* Input para nova nota */}
      <div className="space-y-1.5">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Escreva uma anotação sobre o cliente..."
          rows={3}
          className="text-sm resize-none"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={saving || !newNote.trim()}
          className="w-full"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Salvando</>
          ) : (
            <><Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar nota</>
          )}
        </Button>
      </div>

      {/* Lista de notas existentes */}
      {loading && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Carregando
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-xs text-muted-foreground italic text-center py-2">
          Sem anotações
        </div>
      )}

      {notes.map(note => {
        const isEditing = editingId === note.id;
        return (
          <div
            key={note.id}
            className="group rounded-md border border-border bg-muted/30 p-2 text-xs"
          >
            {isEditing ? (
              <div className="space-y-1.5">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  disabled={updatingId === note.id}
                />
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={cancelEdit}
                    disabled={updatingId === note.id}
                  >
                    <X className="h-3 w-3 mr-0.5" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => saveEdit(note.id)}
                    disabled={updatingId === note.id || !editContent.trim()}
                  >
                    {updatingId === note.id ? (
                      <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 mr-0.5" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap break-words flex-1 text-foreground">{note.content}</p>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => startEdit(note)}
                      title="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(note.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{note.user?.name || 'Sistema'}</span>
                  <span>•</span>
                  <span>{new Date(note.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ContactNotes;
