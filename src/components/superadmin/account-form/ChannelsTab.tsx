import { Switch } from '@evoapi/design-system';
import type { AccountChannels } from '@/types/admin/accounts';

interface ChannelsTabProps {
  value: AccountChannels;
  onChange: (next: AccountChannels) => void;
}

const CHANNEL_ROWS: Array<{
  key: keyof AccountChannels;
  label: string;
  group: 'whatsapp' | 'social' | 'tech';
  helper?: string;
}> = [
  { key: 'whatsapp_cloud',     label: 'WhatsApp Cloud (Meta)',  group: 'whatsapp', helper: 'API oficial via Meta Business.' },
  { key: 'whatsapp_uazapi',    label: 'WhatsApp UAZAPI',        group: 'whatsapp', helper: 'Provider terceirizado.' },
  { key: 'whatsapp_evolution', label: 'WhatsApp Evolution',     group: 'whatsapp', helper: 'Evolution API self-hosted.' },
  { key: 'instagram',          label: 'Instagram Direct',       group: 'social' },
  { key: 'facebook',           label: 'Facebook Messenger',     group: 'social' },
  { key: 'email',              label: 'E-mail',                 group: 'tech' },
  { key: 'webhook',            label: 'Webhook',                group: 'tech',     helper: 'Recebimento via HTTP genérico.' },
  { key: 'api',                label: 'API Channel',            group: 'tech',     helper: 'Canal customizado via API.' }
];

const GROUP_LABEL: Record<'whatsapp' | 'social' | 'tech', string> = {
  whatsapp: 'WhatsApp',
  social:   'Redes sociais',
  tech:     'Outros'
};

/**
 * Aba "Canais" — cada toggle controla `channels.<key>` no FeatureGate.
 * Desabilitar bloqueia a criação de novas inboxes desse provedor mas
 * preserva as existentes (a gate só roda em `inboxes#create`).
 */
export function ChannelsTab({ value, onChange }: ChannelsTabProps) {
  const groups: Array<'whatsapp' | 'social' | 'tech'> = ['whatsapp', 'social', 'tech'];

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const rows = CHANNEL_ROWS.filter((r) => r.group === group);
        return (
          <div key={group} className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {GROUP_LABEL[group]}
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map(({ key, label, helper }) => (
                <label
                  key={key}
                  htmlFor={`ch-${key}`}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">{label}</span>
                    {helper && (
                      <p className="text-xs text-muted-foreground">{helper}</p>
                    )}
                  </div>
                  <Switch
                    id={`ch-${key}`}
                    checked={value[key]}
                    onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
