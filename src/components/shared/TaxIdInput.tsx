import React, { useMemo } from 'react';
import { IMaskInput } from 'react-imask';
import { Input } from '@evoapi/design-system';
import { cn } from '@/lib/utils';

interface TaxIdInputProps {
  type: 'person' | 'company';
  value: string;
  onChange: (value: string) => void;
  country?: string; // ISO code: BR, US, AR, MX, etc.
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

// Brazilian tax id: imask "mask array" picks the shorter CPF mask until the
// user types the 12th digit, then switches to the CNPJ mask automatically.
// This lets us show a single "CPF/CNPJ" field that formats either one.
const BR_MASK_PATTERNS = [
  { mask: '000.000.000-00', maxLength: 11 },
  { mask: '00.000.000/0000-00' },
] as const;

/**
 * Tax ID Configuration by Country
 */
const TAX_ID_CONFIG: Record<string, {
  person: { mask?: string | typeof BR_MASK_PATTERNS; placeholder: string };
  company: { mask?: string | typeof BR_MASK_PATTERNS; placeholder: string };
}> = {
  BR: {
    person: {
      // Auto-detects CPF vs CNPJ by digit count — same field accepts both.
      mask: BR_MASK_PATTERNS,
      placeholder: '000.000.000-00 ou 00.000.000/0000-00',
    },
    company: {
      mask: BR_MASK_PATTERNS,
      placeholder: '000.000.000-00 ou 00.000.000/0000-00',
    },
  },
  US: {
    person: {
      mask: '000-00-0000', // SSN
      placeholder: '000-00-0000',
    },
    company: {
      mask: '00-0000000', // EIN
      placeholder: '00-0000000',
    },
  },
  AR: {
    person: {
      mask: '00-00000000-0', // CUIT/CUIL
      placeholder: '00-00000000-0',
    },
    company: {
      mask: '00-00000000-0', // CUIT
      placeholder: '00-00000000-0',
    },
  },
  MX: {
    person: {
      mask: 'aaaa000000aaa', // RFC
      placeholder: 'AAAA000000AAA',
    },
    company: {
      mask: 'aaa000000aaa', // RFC
      placeholder: 'AAA000000AAA',
    },
  },
  // Default: no mask (free text)
  DEFAULT: {
    person: {
      placeholder: 'Tax ID / SSN',
    },
    company: {
      placeholder: 'Tax ID / EIN',
    },
  },
};

/**
 * TaxIdInput Component
 *
 * International Tax ID input with country-specific masks:
 * - BR: CPF (000.000.000-00) / CNPJ (00.000.000/0000-00)
 * - US: SSN (000-00-0000) / EIN (00-0000000)
 * - AR: CUIT/CUIL (00-00000000-0)
 * - MX: RFC (AAAA000000AAA / AAA000000AAA)
 * - Others: Free text input
 *
 * Always returns unformatted value (only numbers/letters)
 *
 * @example
 * <TaxIdInput
 *   type="person"
 *   country="BR" // from PhoneInput country
 *   value={taxId}
 *   onChange={setTaxId}
 *   error={!!errors.taxId}
 * />
 */
export const TaxIdInput: React.FC<TaxIdInputProps> = ({
  type,
  value,
  onChange,
  country = 'BR',
  disabled = false,
  error = false,
  placeholder,
  className,
  id,
}) => {
  const config = useMemo(() => {
    const countryConfig = TAX_ID_CONFIG[country] || TAX_ID_CONFIG.DEFAULT;
    return countryConfig[type];
  }, [country, type]);

  const hasMask = !!config.mask;

  const baseClassName = cn(
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'md:text-sm',
    error && 'border-destructive focus-visible:ring-destructive',
    className
  );

  // If country has mask, use IMaskInput.
  // `mask` accepts either a string pattern or an array of pattern objects
  // (imask picks the best match by length) — react-imask's type doesn't
  // cover the array variant here, so the cast keeps runtime behaviour.
  if (hasMask) {
    return (
      <IMaskInput
        mask={config.mask as never}
        value={value}
        unmask={true} // Return only numbers/letters
        onAccept={(value: string) => onChange(value)}
        disabled={disabled}
        placeholder={placeholder || config.placeholder}
        id={id}
        className={baseClassName}
      />
    );
  }

  // Otherwise, use free text Input
  return (
    <Input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder || config.placeholder}
      className={baseClassName}
    />
  );
};

export default TaxIdInput;
