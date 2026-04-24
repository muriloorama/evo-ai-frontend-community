import { FormField } from '../../shared/FormField';
import { FormData } from '@/hooks/channels/useChannelForm';
import { sanitizeInboxName } from '@/utils/sanitizeName';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface UazapiFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
  hasUazapiConfig: boolean;
}

// Formulário de criação de canal WhatsApp (backend UAZAPI).
// A UI não menciona "UAZAPI" em lugar nenhum — pro usuário é só "WhatsApp".
export const UazapiForm = ({ form, onFormChange, hasUazapiConfig }: UazapiFormProps) => {
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  const handleDisplayNameChange = (value: string) => {
    onFormChange('display_name', value);
    onFormChange('name', sanitizeInboxName(value));
  };

  return (
    <div className="space-y-6">
      {!hasUazapiConfig && (
        <>
          <FormField
            label="URL do servidor"
            value={getStr('api_url')}
            onChange={value => onFormChange('api_url', value)}
            placeholder="https://seu-servidor.uazapi.com"
            type="url"
            required
          />
          <FormField
            label="Token de administração"
            value={getStr('admin_token')}
            onChange={value => onFormChange('admin_token', value)}
            placeholder="Token global fornecido pelo provedor"
            type="password"
            required
          />
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="whatsapp-credentials">
        <FormField
          label="Nome da caixa"
          value={getStr('display_name')}
          onChange={handleDisplayNameChange}
          placeholder="Ex: Suporte WhatsApp"
          helpText="Nome visível para sua equipe"
          required
        />
        <FormField
          label="Identificador"
          value={getStr('name')}
          onChange={value => onFormChange('name', value)}
          placeholder="suporte-whatsapp"
          helpText="Gerado automaticamente a partir do nome"
          required
          readOnly
        />
      </div>

      <div>
        <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
          Número do WhatsApp <span className="text-sidebar-foreground/50">(opcional)</span>
        </label>
        <PhoneInput
          value={getStr('phone_number')}
          onChange={value => onFormChange('phone_number', value)}
          placeholder="+55 (11) 99999-9999"
          defaultCountry="BR"
        />
        <p className="text-xs text-sidebar-foreground/60 mt-1">
          Deixe em branco para usar QR Code. O número será capturado automaticamente ao conectar.
        </p>
      </div>
    </div>
  );
};
