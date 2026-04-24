import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label
} from '@evoapi/design-system';
import { Pencil, Plus, Trash2, Activity } from 'lucide-react';
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listExecutions,
  FollowUpRule,
  FollowUpExecution,
  UpsertRulePayload,
  MessageSource,
  MaxAttemptsAction
} from '@/services/followUps/followUpsService';
import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

interface PipelineOption {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}
interface AgentBotOption {
  id: string;
  name: string;
}

const DEFAULT_INTERVALS_HOURS = [1, 12, 18];
const DEFAULT_FORM: UpsertRulePayload = {
  name: '',
  pipeline_stage_id: '',
  intervals: DEFAULT_INTERVALS_HOURS.map(h => h * 3600),
  message_source: 'inbox_agent',
  custom_agent_bot_id: null,
  template_text: '',
  extra_instructions: '',
  on_max_attempts_action: 'noop',
  on_max_target_stage_id: null,
  enabled: true
};

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; ruleId: string };

export default function FollowUps() {
  const [tab, setTab] = useState<'rules' | 'executions'>('rules');
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [executions, setExecutions] = useState<FollowUpExecution[]>([]);
  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const [agentBots, setAgentBots] = useState<AgentBotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<DialogMode>({ kind: 'closed' });
  const [form, setForm] = useState<UpsertRulePayload>(DEFAULT_FORM);
  const [intervalHours, setIntervalHours] = useState<number[]>(DEFAULT_INTERVALS_HOURS);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rs, ps, abs] = await Promise.all([
        listRules(),
        api.get('/pipelines').then(r => extractData<{ pipelines?: PipelineOption[]; data?: PipelineOption[] }>(r)).then(d => (d as any).pipelines || (d as any).data || []),
        api.get('/agent_bots').then(r => extractData<any>(r)).then(d => (d.agent_bots || d.data || d || []) as AgentBotOption[])
      ]);
      setRules(rs);
      setPipelines(ps as PipelineOption[]);
      setAgentBots(abs);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Falha ao carregar follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (tab !== 'executions') return;
    listExecutions('pending').then(setExecutions).catch(err => console.error(err));
  }, [tab]);

  const allStages = useMemo(() =>
    pipelines.flatMap(p => p.stages.map(s => ({ ...s, pipelineName: p.name }))),
  [pipelines]);

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setIntervalHours(DEFAULT_INTERVALS_HOURS);
    setFormError(null);
    setDialogMode({ kind: 'create' });
  };

  const openEdit = (rule: FollowUpRule) => {
    setForm({
      name: rule.name,
      pipeline_stage_id: rule.pipeline_stage_id,
      intervals: rule.intervals,
      message_source: rule.message_source,
      custom_agent_bot_id: rule.custom_agent_bot_id,
      template_text: rule.template_text || '',
      extra_instructions: rule.extra_instructions || '',
      on_max_attempts_action: rule.on_max_attempts_action,
      on_max_target_stage_id: rule.on_max_target_stage_id,
      enabled: rule.enabled
    });
    setIntervalHours(rule.intervals.map(s => Math.round(s / 3600)));
    setFormError(null);
    setDialogMode({ kind: 'edit', ruleId: rule.id });
  };

  const closeDialog = () => setDialogMode({ kind: 'closed' });

  const submit = async () => {
    if (!form.name.trim()) { setFormError('Nome é obrigatório'); return; }
    if (!form.pipeline_stage_id) { setFormError('Selecione um estágio'); return; }
    const intervals = intervalHours.filter(h => h > 0).map(h => h * 3600);
    if (intervals.length === 0) { setFormError('Configure pelo menos 1 intervalo'); return; }

    const payload: UpsertRulePayload = { ...form, intervals };
    setSaving(true);
    setFormError(null);
    try {
      if (dialogMode.kind === 'edit') {
        await updateRule(dialogMode.ruleId, payload);
      } else {
        await createRule(payload);
      }
      closeDialog();
      await load();
    } catch (err: any) {
      const details = err?.response?.data?.error?.details;
      setFormError(Array.isArray(details) ? details.join('; ') : (err?.response?.data?.error?.message || 'Falha ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (rule: FollowUpRule) => {
    await updateRule(rule.id, { enabled: !rule.enabled });
    await load();
  };

  const remove = async (rule: FollowUpRule) => {
    if (!window.confirm(`Excluir follow-up "${rule.name}"?`)) return;
    await deleteRule(rule.id);
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-5 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 md:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold">Follow-ups</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reengaje leads que pararam de responder. Regras disparam ao entrar num estágio do kanban e cancelam quando há resposta ou mudança de estágio.
            </p>
          </div>
          {tab === 'rules' && (
            <Button onClick={openCreate} className="gap-2 h-11 md:h-9 w-full md:w-auto">
              <Plus className="h-4 w-4" />
              Nova regra
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-5 md:mb-6">
          <Button variant={tab === 'rules' ? 'default' : 'ghost'} className="h-10 md:h-9 flex-1 md:flex-none" onClick={() => setTab('rules')}>
            Regras
          </Button>
          <Button variant={tab === 'executions' ? 'default' : 'ghost'} className="h-10 md:h-9 flex-1 md:flex-none" onClick={() => setTab('executions')}>
            <Activity className="h-4 w-4 mr-1" />
            Em andamento
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">{error}</div>
        )}

        {tab === 'rules' && (
          <div className="border rounded-lg overflow-hidden bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Estágio</th>
                  <th className="text-left p-3">Tentativas</th>
                  <th className="text-left p-3">Origem</th>
                  <th className="text-center p-3">Em andamento</th>
                  <th className="text-center p-3">Ativo</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
                {!loading && rules.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma regra de follow-up</td></tr>}
                {!loading && rules.map(r => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.pipeline_stage_name}</td>
                    <td className="p-3 text-xs font-mono">{r.intervals.map(s => `${Math.round(s / 3600)}h`).join(' → ')}</td>
                    <td className="p-3 text-xs">
                      {r.message_source === 'template' && 'Template'}
                      {r.message_source === 'inbox_agent' && 'Agente do inbox'}
                      {r.message_source === 'custom_agent' && (r.custom_agent_bot_name || 'Agente custom')}
                    </td>
                    <td className="p-3 text-center">{r.executions_pending}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleEnabled(r)}
                        className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ' + (r.enabled ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground')}
                      >
                        {r.enabled ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="gap-1"><Pencil className="h-4 w-4" />Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(r)} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'executions' && (
          <div className="border rounded-lg overflow-hidden bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Lead</th>
                  <th className="text-left p-3">Regra</th>
                  <th className="text-center p-3">Tentativas</th>
                  <th className="text-left p-3">Próxima</th>
                </tr>
              </thead>
              <tbody>
                {executions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum follow-up em andamento</td></tr>}
                {executions.map(e => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{e.contact_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{e.contact_phone}</div>
                    </td>
                    <td className="p-3">{e.rule_name}</td>
                    <td className="p-3 text-center">{e.attempts_count}/{e.max_attempts}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(e.next_attempt_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogMode.kind !== 'closed'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-h-[95vh] sm:max-h-[90vh] p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogMode.kind === 'edit' ? 'Editar follow-up' : 'Nova regra de follow-up'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-y-auto -mx-1 px-1">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reativar leads em prospecção" />
            </div>

            <div>
              <Label>Estágio do kanban *</Label>
              <select
                value={form.pipeline_stage_id}
                onChange={e => setForm({ ...form, pipeline_stage_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 h-11 md:h-9 border rounded-md bg-background text-base md:text-sm"
              >
                <option value="">Selecione...</option>
                {allStages.map(s => (
                  <option key={s.id} value={s.id}>{(s as any).pipelineName} → {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Intervalos (em horas)</Label>
              <div className="flex gap-2 mt-1">
                {[0, 1, 2].map(i => (
                  <Input
                    key={i}
                    type="number"
                    min={1}
                    value={intervalHours[i] ?? ''}
                    placeholder={`${DEFAULT_INTERVALS_HOURS[i]}h`}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      const next = [...intervalHours];
                      next[i] = v;
                      setIntervalHours(next);
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ex: 1 / 12 / 18 = primeira tentativa após 1h, segunda 12h depois, terceira 18h depois.</p>
            </div>

            <div>
              <Label>Origem da mensagem</Label>
              <div className="space-y-2 mt-1.5">
                {(['inbox_agent', 'custom_agent', 'template'] as MessageSource[]).map(src => {
                  const labels: Record<MessageSource, [string, string]> = {
                    inbox_agent: ['Agente do inbox', 'Reusa o agente que já responde no canal, com instrução extra de re-engajamento'],
                    custom_agent: ['Agente específico', 'Use um agent_bot dedicado para follow-ups'],
                    template: ['Template estático', 'Texto fixo com variáveis {{name}}, {{phone}}, {{attempt}}']
                  };
                  const checked = form.message_source === src;
                  return (
                    <label key={src} className={'flex items-start gap-2 p-2 border rounded-md cursor-pointer ' + (checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent')}>
                      <input type="radio" name="src" checked={checked} onChange={() => setForm({ ...form, message_source: src })} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{labels[src][0]}</div>
                        <div className="text-xs text-muted-foreground">{labels[src][1]}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {form.message_source === 'custom_agent' && (
              <div>
                <Label>Agent bot</Label>
                <select
                  value={form.custom_agent_bot_id || ''}
                  onChange={e => setForm({ ...form, custom_agent_bot_id: e.target.value || null })}
                  className="w-full mt-1 px-3 py-2 h-11 md:h-9 border rounded-md bg-background text-base md:text-sm"
                >
                  <option value="">Selecione...</option>
                  {agentBots.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
            )}

            {form.message_source === 'template' && (
              <div>
                <Label>Texto do template</Label>
                <textarea
                  value={form.template_text || ''}
                  onChange={e => setForm({ ...form, template_text: e.target.value })}
                  rows={4}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-base md:text-sm font-mono"
                  placeholder="Oi {{name}}, ainda posso te ajudar?"
                />
              </div>
            )}

            {form.message_source !== 'template' && (
              <div>
                <Label>Instruções extras pra IA (opcional)</Label>
                <textarea
                  value={form.extra_instructions || ''}
                  onChange={e => setForm({ ...form, extra_instructions: e.target.value })}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-base md:text-sm"
                  placeholder="Ex: tom mais assertivo, ofereça desconto de 10%"
                />
              </div>
            )}

            <div>
              <Label>Após a última tentativa sem resposta</Label>
              <div className="space-y-2 mt-1.5">
                {(['noop', 'move_to_stage'] as MaxAttemptsAction[]).map(act => {
                  const checked = form.on_max_attempts_action === act;
                  const label = act === 'noop' ? 'Não fazer nada' : 'Mover para outro estágio (ex: Desqualificado)';
                  return (
                    <label key={act} className={'flex items-center gap-2 p-2 border rounded-md cursor-pointer ' + (checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent')}>
                      <input type="radio" name="action" checked={checked} onChange={() => setForm({ ...form, on_max_attempts_action: act })} />
                      <span className="text-sm">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {form.on_max_attempts_action === 'move_to_stage' && (
              <div>
                <Label>Estágio destino</Label>
                <select
                  value={form.on_max_target_stage_id || ''}
                  onChange={e => setForm({ ...form, on_max_target_stage_id: e.target.value || null })}
                  className="w-full mt-1 px-3 py-2 h-11 md:h-9 border rounded-md bg-background text-base md:text-sm"
                >
                  <option value="">Selecione...</option>
                  {allStages.map(s => (<option key={s.id} value={s.id}>{(s as any).pipelineName} → {s.name}</option>))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
              <span className="text-sm font-medium">Ativo</span>
            </label>

            {formError && <div className="text-sm text-destructive">{formError}</div>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving} className="h-11 md:h-9 w-full sm:w-auto">Cancelar</Button>
            <Button onClick={submit} disabled={saving} className="h-11 md:h-9 w-full sm:w-auto">{saving ? 'Salvando...' : (dialogMode.kind === 'edit' ? 'Salvar' : 'Criar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
