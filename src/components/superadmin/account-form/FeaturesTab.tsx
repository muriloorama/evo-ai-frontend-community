import { Switch } from '@evoapi/design-system';
import type { AccountFeatureFlags } from '@/types/admin/accounts';

interface FeaturesTabProps {
  value: AccountFeatureFlags;
  onChange: (next: AccountFeatureFlags) => void;
}

const FEATURE_ROWS: Array<{
  key: keyof AccountFeatureFlags;
  label: string;
  helper?: string;
}> = [
  { key: 'pipelines',          label: 'Pipelines',           helper: 'CRM kanban por estágios.' },
  { key: 'macros',             label: 'Macros',              helper: 'Atalhos de respostas + ações compostas.' },
  { key: 'broadcast',          label: 'Disparos em massa',   helper: 'Campanhas de envio para listas de contatos.' },
  { key: 'followup',           label: 'Follow-up automático',helper: 'Reengajamento programado.' },
  { key: 'scheduled_messages', label: 'Mensagens agendadas', helper: 'Agendar envio individual em uma conversa.' },
  { key: 'csat',               label: 'CSAT',                helper: 'Pesquisa de satisfação ao final do atendimento.' },
  { key: 'automations',        label: 'Automações',          helper: 'Regras event → action.' },
  { key: 'working_hours',      label: 'Horário comercial',   helper: 'Mensagem off-hours por inbox.' },
  { key: 'mass_actions',       label: 'Ações em massa',      helper: 'Operações em múltiplas conversas.' },
  { key: 'reports',            label: 'Relatórios',          helper: 'Dashboards e exportações.' }
];

/**
 * Aba "Funcionalidades" — toggles por feature de produto. Cada um mapeia
 * pra `features.<key>` no FeatureGate. Endpoints de criação/edição checam
 * o gate via `ensure_feature!` no ApplicationController.
 */
export function FeaturesTab({ value, onChange }: FeaturesTabProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {FEATURE_ROWS.map(({ key, label, helper }) => (
        <label
          key={key}
          htmlFor={`feat-${key}`}
          className="flex items-start justify-between gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
        >
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{label}</span>
            {helper && (
              <p className="text-xs text-muted-foreground">{helper}</p>
            )}
          </div>
          <Switch
            id={`feat-${key}`}
            checked={value[key]}
            onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
          />
        </label>
      ))}
    </div>
  );
}
