import { Label } from '@evoapi/design-system';
import { NumberOrUnlimitedInput } from './NumberOrUnlimitedInput';
import type { AccountLimits } from '@/types/admin/accounts';

interface LimitsTabProps {
  value: AccountLimits;
  onChange: (next: AccountLimits) => void;
}

const ROWS: Array<{ key: keyof AccountLimits; label: string; helper?: string }> = [
  { key: 'max_inboxes',             label: 'Máx. caixas de entrada',         helper: 'WhatsApp, Instagram, e-mail etc.' },
  { key: 'max_agents',              label: 'Máx. operadores',                helper: 'Usuários humanos com role agent.' },
  { key: 'max_contacts',            label: 'Máx. contatos',                  helper: 'Total de contatos cadastrados.' },
  { key: 'max_conversations_month', label: 'Máx. conversas no mês',          helper: 'Reseta no primeiro dia do mês.' },
  { key: 'max_storage_mb',          label: 'Máx. armazenamento (MB)',        helper: 'Anexos enviados e recebidos.' }
];

/**
 * Aba "Limites" — caps numéricos. Campo em branco vira `null` (sem limite).
 * O FeatureGate no backend trata null como ilimitado, então deixar tudo
 * vazio = comportamento atual do workspace.
 */
export function LimitsTab({ value, onChange }: LimitsTabProps) {
  return (
    <div className="space-y-4">
      {ROWS.map(({ key, label, helper }) => (
        <div key={key} className="grid gap-1.5">
          <Label htmlFor={`limit-${key}`}>{label}</Label>
          <NumberOrUnlimitedInput
            id={`limit-${key}`}
            value={value[key]}
            onChange={next => onChange({ ...value, [key]: next })}
          />
          {helper && (
            <p className="text-xs text-muted-foreground">{helper}</p>
          )}
        </div>
      ))}
      <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
        Deixe em branco para "sem limite". Inserir <span className="font-mono">0</span> bloqueia totalmente o recurso.
      </p>
    </div>
  );
}
