import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Button,
} from '@evoapi/design-system';
import { Copy, Link as LinkIcon, MessageSquare, Check } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_OPTIONS = [
  { value: 'meta', label: 'Meta (Facebook)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'organic', label: 'Orgânico' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Outro' },
];

const MEDIUM_OPTIONS = [
  { value: 'cpc', label: 'CPC (anúncio pago)' },
  { value: 'social', label: 'Social' },
  { value: 'email', label: 'Email' },
  { value: 'referral', label: 'Referral' },
  { value: 'organic', label: 'Orgânico' },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildUtmQueryString = (utms: Record<string, string>) => {
  const parts: string[] = [];
  (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const).forEach(key => {
    const v = utms[key];
    if (v) parts.push(`${key}=${encodeURIComponent(v)}`);
  });
  return parts.join('&');
};

const buildUtmHashtags = (utms: Record<string, string>) =>
  (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const)
    .map(k => (utms[k] ? `#${k}=${utms[k]}` : null))
    .filter(Boolean)
    .join(' ');

const CopyButton = ({ value, disabled }: { value: string; disabled?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não consegui copiar — selecione manualmente');
    }
  };
  return (
    <Button size="sm" variant="outline" onClick={handleCopy} disabled={disabled || !value}>
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  );
};

const UtmFields = ({
  source,
  medium,
  campaign,
  content,
  onChange,
}: {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  onChange: (patch: Partial<{ source: string; medium: string; campaign: string; content: string }>) => void;
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Origem (utm_source)</Label>
        <select
          value={source}
          onChange={e => onChange({ source: e.target.value })}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          {SOURCE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Meio (utm_medium)</Label>
        <select
          value={medium}
          onChange={e => onChange({ medium: e.target.value })}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          {MEDIUM_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <Label className="text-xs">Nome da campanha (utm_campaign)</Label>
      <Input
        placeholder="ex.: plano90_igrejas_abr26"
        value={campaign}
        onChange={e => onChange({ campaign: slugify(e.target.value) })}
      />
      <p className="text-[11px] text-muted-foreground">
        Letras minúsculas, sem acento, use _ para separar. Aparece no relatório como nome da campanha.
      </p>
    </div>
    <div className="flex flex-col gap-1">
      <Label className="text-xs">Conteúdo / variação (utm_content) — opcional</Label>
      <Input
        placeholder="ex.: ad_formulario"
        value={content}
        onChange={e => onChange({ content: slugify(e.target.value) })}
      />
    </div>
  </>
);

const LandingPageBuilder = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [utm, setUtm] = useState({ source: 'meta', medium: 'cpc', campaign: '', content: '' });

  const finalUrl = useMemo(() => {
    if (!baseUrl.trim()) return '';
    const qs = buildUtmQueryString({
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
    });
    if (!qs) return baseUrl;
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}${qs}`;
  }, [baseUrl, utm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" /> Link do anúncio (URL da sua Landing Page)
        </CardTitle>
        <CardDescription>
          Cole a URL da sua página no campo abaixo — usaremos ela no Meta Ads Manager como URL do anúncio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">URL da Landing Page</Label>
          <Input
            placeholder="https://plano90.seu-site.com"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
          />
        </div>

        <UtmFields
          source={utm.source}
          medium={utm.medium}
          campaign={utm.campaign}
          content={utm.content}
          onChange={patch => setUtm(prev => ({ ...prev, ...patch }))}
        />

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Link final (cole no Meta Ads como URL do site)</Label>
          <div className="text-xs font-mono break-all">{finalUrl || <span className="italic text-muted-foreground">Preencha a URL acima</span>}</div>
          <div className="flex justify-end">
            <CopyButton value={finalUrl} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WhatsAppBuilder = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Olá! Quero saber sobre o Plano 90 Dias.');
  const [utm, setUtm] = useState({ source: 'meta', medium: 'cpc', campaign: '', content: '' });

  const hashtags = useMemo(
    () =>
      buildUtmHashtags({
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        utm_content: utm.content,
      }),
    [utm]
  );

  const normalizedPhone = phone.replace(/\D/g, '');

  const finalUrl = useMemo(() => {
    if (!normalizedPhone) return '';
    const text = hashtags ? `${message}\n\n${hashtags}` : message;
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
  }, [normalizedPhone, message, hashtags]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Link do WhatsApp (botão da LP / formulário)
        </CardTitle>
        <CardDescription>
          Gera um link <code>wa.me/...</code> com a mensagem inicial e as hashtags UTM embutidas. O CRM lê as
          hashtags na primeira mensagem e atribui a origem automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Número WhatsApp (com DDI)</Label>
            <Input
              placeholder="5518999999999"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Apenas números. Ex.: 55 + DDD + número.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Mensagem pré-pronta</Label>
          <textarea
            className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-sm"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <UtmFields
          source={utm.source}
          medium={utm.medium}
          campaign={utm.campaign}
          content={utm.content}
          onChange={patch => setUtm(prev => ({ ...prev, ...patch }))}
        />

        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Link final (cole no botão "WhatsApp" do seu site/formulário)</Label>
          <div className="text-xs font-mono break-all">
            {finalUrl || <span className="italic text-muted-foreground">Preencha o número acima</span>}
          </div>
          <div className="flex justify-end">
            <CopyButton value={finalUrl} />
          </div>
        </div>

        {hashtags && (
          <div className="rounded-md border border-border bg-muted/10 p-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Pré-visualização do que a pessoa manda</Label>
            <pre className="text-xs whitespace-pre-wrap font-sans">{`${message}\n\n${hashtags}`}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UtmBuilderTab = () => {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como usar</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              <strong>1.</strong> Preencha o <em>Link do anúncio</em> com a URL da sua LP e copie o link final
              gerado — é ele que você cola no Meta Ads Manager como URL do site.
            </span>
            <span className="block">
              <strong>2.</strong> Preencha o <em>Link do WhatsApp</em> com o mesmo nome de campanha e copie o
              link final — cole no botão "Enviar pelo WhatsApp" do seu formulário/LP.
            </span>
            <span className="block">
              Quando o contato chegar no WhatsApp, a origem será capturada automaticamente e aparecerá no
              relatório <strong>Rastreamento de dados</strong>.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LandingPageBuilder />
        <WhatsAppBuilder />
      </div>
    </div>
  );
};

export default UtmBuilderTab;
