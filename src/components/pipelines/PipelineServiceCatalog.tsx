import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Loader2, Plus, Pencil, Trash2, Check, X as XIcon } from 'lucide-react';
import pipelineServiceDefinitionsService from '@/services/pipelines/pipelineServiceDefinitionsService';
import type { PipelineServiceDefinition } from '@/types/analytics';

interface PipelineServiceCatalogProps {
  pipelineId: string;
}

type Currency = 'BRL' | 'USD' | 'EUR';

interface DraftService {
  name: string;
  default_value: string;
  currency: Currency;
}

const emptyDraft: DraftService = { name: '', default_value: '', currency: 'BRL' };

const PipelineServiceCatalog: React.FC<PipelineServiceCatalogProps> = ({ pipelineId }) => {
  const [services, setServices] = useState<PipelineServiceDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftService>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftService>(emptyDraft);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await pipelineServiceDefinitionsService.getServiceDefinitions(pipelineId);
      setServices(list || []);
    } catch (err) {
      console.error('Error loading service catalog:', err);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleCreate = async () => {
    const name = draft.name.trim();
    const value = parseFloat(draft.default_value);
    if (!name) { toast.error('Nome é obrigatório'); return; }
    if (Number.isNaN(value) || value < 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      const created = await pipelineServiceDefinitionsService.createServiceDefinition(pipelineId, {
        name,
        default_value: value,
        currency: draft.currency,
      });
      setServices(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(emptyDraft);
      toast.success('Serviço adicionado ao catálogo');
    } catch (err) {
      console.error('Error creating service:', err);
      toast.error('Erro ao adicionar serviço');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (svc: PipelineServiceDefinition) => {
    setEditingId(svc.id);
    setEditDraft({
      name: svc.name,
      default_value: String(svc.default_value),
      currency: svc.currency,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft);
  };

  const handleUpdate = async (id: string) => {
    const name = editDraft.name.trim();
    const value = parseFloat(editDraft.default_value);
    if (!name) { toast.error('Nome é obrigatório'); return; }
    if (Number.isNaN(value) || value < 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      const updated = await pipelineServiceDefinitionsService.updateServiceDefinition(pipelineId, id, {
        name,
        default_value: value,
        currency: editDraft.currency,
      });
      setServices(prev => prev.map(s => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)));
      cancelEdit();
      toast.success('Serviço atualizado');
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remover o serviço "${name}" do catálogo?`)) return;
    try {
      await pipelineServiceDefinitionsService.deleteServiceDefinition(pipelineId, id);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Serviço removido');
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Erro ao remover serviço');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Catálogo de serviços</h3>
        <p className="text-sm text-muted-foreground">
          Serviços pré-definidos que ficam disponíveis no dropdown ao editar um item do pipeline.
        </p>
      </div>

      {/* Formulário de criação */}
      <div className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
        <Label className="text-xs font-medium">Adicionar novo serviço</Label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_90px_auto] gap-2">
          <Input
            placeholder="Nome do serviço"
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            disabled={saving}
          />
          <Input
            type="number"
            placeholder="Valor"
            value={draft.default_value}
            onChange={e => setDraft({ ...draft, default_value: e.target.value })}
            step="0.01"
            min="0"
            disabled={saving}
          />
          <Select
            value={draft.currency}
            onValueChange={(v: Currency) => setDraft({ ...draft, currency: v })}
            disabled={saving}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando
        </div>
      ) : services.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 italic">
          Nenhum serviço cadastrado no catálogo.
        </div>
      ) : (
        <div className="space-y-1">
          {services.map(svc => {
            const isEditing = editingId === svc.id;
            return (
              <div
                key={svc.id}
                className="flex items-center gap-2 border border-border rounded-md px-2 py-1.5 hover:bg-accent/50"
              >
                {isEditing ? (
                  <>
                    <Input
                      className="flex-1"
                      value={editDraft.name}
                      onChange={e => setEditDraft({ ...editDraft, name: e.target.value })}
                      disabled={saving}
                    />
                    <Input
                      type="number"
                      className="w-[110px]"
                      value={editDraft.default_value}
                      onChange={e => setEditDraft({ ...editDraft, default_value: e.target.value })}
                      step="0.01"
                      min="0"
                      disabled={saving}
                    />
                    <Select
                      value={editDraft.currency}
                      onValueChange={(v: Currency) => setEditDraft({ ...editDraft, currency: v })}
                      disabled={saving}
                    >
                      <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleUpdate(svc.id)} disabled={saving} title="Salvar">
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={cancelEdit} disabled={saving} title="Cancelar">
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{svc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {svc.currency} {svc.formatted_default_value}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => startEdit(svc)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(svc.id, svc.name)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PipelineServiceCatalog;
