import { Label, Switch } from '@evoapi/design-system';
import { NumberOrUnlimitedInput } from './NumberOrUnlimitedInput';
import type { AccountAi } from '@/types/admin/accounts';

interface AiTabProps {
  value: AccountAi;
  onChange: (next: AccountAi) => void;
}

/**
 * Aba "AI" — toggle global para atendimento por agentes de IA + cap de bots.
 * Quando `enabled=false`, criação de agent_bots retorna 403 (ver
 * `validate_agent_bot_limit` em ResourceLimitsHelper).
 */
export function AiTab({ value, onChange }: AiTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
        <div className="space-y-1">
          <Label htmlFor="ai-enabled" className="text-sm font-medium">
            Atendimento por IA
          </Label>
          <p className="text-xs text-muted-foreground">
            Permite criar e usar agentes (bots) automatizados nas caixas de entrada.
          </p>
        </div>
        <Switch
          id="ai-enabled"
          checked={value.enabled}
          onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="ai-max-bots">Máx. agentes de IA</Label>
        <NumberOrUnlimitedInput
          id="ai-max-bots"
          value={value.max_bots}
          onChange={(next) => onChange({ ...value, max_bots: next })}
          disabled={!value.enabled}
        />
        <p className="text-xs text-muted-foreground">
          Quantidade máxima de agent_bots ativos no workspace. Vazio = sem limite.
        </p>
      </div>
    </div>
  );
}
