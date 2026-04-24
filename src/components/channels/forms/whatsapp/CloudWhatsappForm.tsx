import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../../shared/FormField';
import { sanitizeInboxName } from '@/utils/sanitizeName';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface CloudWhatsappFormProps {
  form: Record<string, string | boolean>;
  onFormChange: (key: string, value: string | boolean) => void;
}

const generateVerifyToken = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

const getWebhookBase = (): string => {
  if (typeof window === 'undefined') return '';
  const explicit = (import.meta as any)?.env?.VITE_API_URL;
  if (typeof explicit === 'string' && explicit) return explicit.replace(/\/$/, '');
  const { protocol, hostname } = window.location;
  const apiHost = hostname.startsWith('crm.') ? hostname.replace(/^crm\./, 'api.') : hostname;
  return `${protocol}//${apiHost}`;
};

export const CloudWhatsappForm = ({ form, onFormChange }: CloudWhatsappFormProps) => {
  const { t } = useLanguage('whatsapp');

  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  useEffect(() => {
    if (!getStr('webhook_verify_token')) {
      onFormChange('webhook_verify_token', generateVerifyToken());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisplayNameChange = (value: string) => {
    onFormChange('display_name', value);
    onFormChange('name', sanitizeInboxName(value));
  };

  const verifyToken = getStr('webhook_verify_token');
  const phoneDigits = getStr('phone_number').replace(/\D/g, '');

  const callbackUrl = useMemo(() => {
    const base = getWebhookBase();
    if (!base) return '';
    return phoneDigits
      ? `${base}/webhooks/whatsapp/${phoneDigits}`
      : `${base}/webhooks/whatsapp/{seu_numero_sem_+}`;
  }, [phoneDigits]);

  const copy = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado`))
      .catch(() => toast.error('Falha ao copiar'));
  };

  const regenerateToken = () => {
    onFormChange('webhook_verify_token', generateVerifyToken());
    toast.success('Novo Verify Token gerado');
  };

  return (
    <div className="space-y-6">
      <div data-tour="whatsapp-cloud-credentials" className="space-y-4">
        <FormField
          label={t('cloudWhatsappForm.fields.displayName.label')}
          value={getStr('display_name')}
          onChange={handleDisplayNameChange}
          placeholder={t('cloudWhatsappForm.fields.displayName.placeholder')}
          required
        />

        <FormField
          label={t('cloudWhatsappForm.fields.channelName.label')}
          value={getStr('name')}
          onChange={value => onFormChange('name', value)}
          placeholder={t('cloudWhatsappForm.fields.channelName.placeholder')}
          required
          readOnly
        />

        <div>
          <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
            {t('cloudWhatsappForm.fields.phoneNumber.label')}{' '}
            <span className="text-destructive">*</span>
          </label>
          <PhoneInput
            value={getStr('phone_number')}
            onChange={value => onFormChange('phone_number', value)}
            placeholder={t('cloudWhatsappForm.fields.phoneNumber.placeholder')}
            defaultCountry="BR"
          />
        </div>

        <FormField
          label="ID do Número de Telefone"
          value={getStr('phone_number_id')}
          onChange={value => onFormChange('phone_number_id', value)}
          placeholder="Ex: 123456789012345"
          required
        />

        <FormField
          label="ID da Conta Empresarial (WABA ID)"
          value={getStr('waba_id')}
          onChange={value => {
            onFormChange('waba_id', value);
            onFormChange('business_account_id', value);
          }}
          placeholder="Ex: 987654321098765"
          required
        />

        <FormField
          label="Chave de API (Access Token)"
          value={getStr('api_key')}
          onChange={value => onFormChange('api_key', value)}
          placeholder="EAAG... (Permanent ou System User Access Token)"
          required
        />
      </div>

      <div className="rounded-lg border border-amber-300/30 bg-amber-50/10 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-sidebar-foreground">
            Configuração do Webhook na Meta
          </h3>
          <p className="text-xs text-sidebar-foreground/70 mt-1">
            Copie estes dados e cole em <strong>Meta for Developers → Seu App → WhatsApp → Configuration → Webhooks</strong>.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-sidebar-foreground/80 block mb-1">
            Callback URL
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={callbackUrl}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md font-mono"
            />
            <button
              type="button"
              onClick={() => copy(callbackUrl, 'Callback URL')}
              disabled={!phoneDigits}
              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40"
            >
              Copiar
            </button>
          </div>
          {!phoneDigits && (
            <p className="text-xs text-sidebar-foreground/50 mt-1">
              Preencha o número de telefone acima pra gerar a URL.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-sidebar-foreground/80 block mb-1">
            Verify Token
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={verifyToken}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md font-mono"
            />
            <button
              type="button"
              onClick={() => copy(verifyToken, 'Verify Token')}
              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={regenerateToken}
              className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted"
              title="Gerar novo token"
            >
              ↻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
