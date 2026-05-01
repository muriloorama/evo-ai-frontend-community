import { Input } from '@evoapi/design-system';
import type { ChangeEvent } from 'react';
import type { LimitValue } from '@/types/admin/accounts';

interface NumberOrUnlimitedInputProps {
  id: string;
  value: LimitValue;
  onChange: (next: LimitValue) => void;
  placeholder?: string;
  min?: number;
  disabled?: boolean;
}

/**
 * Input numérico que mapeia campo vazio → null ("sem limite").
 * Usado em todos os campos de cap (max_inboxes, max_agents, max_bots, etc.).
 *
 * Convenção do FeatureGate (lib/account_feature_gate.rb): null = unlimited,
 * inteiro positivo = teto. O componente nunca emite 0 negativo.
 */
export function NumberOrUnlimitedInput({
  id,
  value,
  onChange,
  placeholder = 'Sem limite',
  min = 0,
  disabled = false
}: NumberOrUnlimitedInputProps) {
  const display = value === null || value === undefined ? '' : String(value);

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === '') {
      onChange(null);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= min) {
      onChange(Math.floor(parsed));
    }
  };

  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      placeholder={placeholder}
      value={display}
      onChange={handle}
      disabled={disabled}
    />
  );
}
