import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@evoapi/design-system';
import {
  ChevronDown,
  Code2,
  Copy,
  ExternalLink,
  KeyRound,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  accountApiKeysService,
  type AccountApiKey,
} from '@/services/accountApiKeysService';

// Lightweight, hand-curated API reference page. Not a full OpenAPI spec —
// just the endpoints agents are most likely to integrate with. Each entry
// renders a method badge, path, description, request/response samples and
// a copy-ready curl snippet.

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Endpoint {
  method: Method;
  path: string;
  summary: string;
  description?: string;
  body?: string;
  response?: string;
  notes?: string[];
}

interface Section {
  id: string;
  title: string;
  emoji: string;
  overview?: string;
  endpoints: Endpoint[];
}

const METHOD_COLOR: Record<Method, string> = {
  GET: 'bg-blue-600 text-white',
  POST: 'bg-green-600 text-white',
  PATCH: 'bg-amber-600 text-white',
  DELETE: 'bg-red-600 text-white',
};

const SECTIONS: Section[] = [
  {
    id: 'auth',
    title: 'Autenticação',
    emoji: '🔐',
    overview:
      'A forma recomendada de autenticar integrações é usar uma API key da conta, gerada no card acima. Envie no header X-Api-Key em qualquer request. A chave é escopo-de-conta (todas as operações rodam no contexto da sua empresa), revogável a qualquer momento e não expira sozinha.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/account_api_keys',
        summary: 'Listar API keys da conta',
        description: 'Retorna só last4 do token, nome, criador e status.',
      },
      {
        method: 'POST',
        path: '/api/v1/account_api_keys',
        summary: 'Criar nova API key (admin only)',
        body: `{
  "name": "Integração Make"
}`,
        response: `{
  "success": true,
  "data": {
    "id": "...",
    "name": "Integração Make",
    "token": "evo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "last4": "..."
  }
}`,
        notes: [
          'O campo `token` só aparece UMA VEZ nessa resposta. Depois disso, apenas `last4` é mostrado.',
        ],
      },
      {
        method: 'DELETE',
        path: '/api/v1/account_api_keys/:id',
        summary: 'Revogar API key',
        notes: ['Revogação é instantânea — integrações usando a chave param de funcionar.'],
      },
    ],
  },
  {
    id: 'contacts',
    title: 'Contatos',
    emoji: '👤',
    overview:
      'CRUD completo de contatos. Contatos têm `type: person | company`, atributos customizados arbitrários, e podem ser anexados a um ou mais inboxes via contact_inboxes.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/contacts',
        summary: 'Listar contatos (paginado)',
        description:
          'Aceita params `page`, `per_page`, `query`, `contact_type`, `labels`, `company_id`, `type`. Não-admins só veem contatos que tenham conversas em seus inboxes.',
        response: `{
  "success": true,
  "data": [ { "id": "...", "name": "...", "phone_number": "+55...", ... } ],
  "meta": { "count": 42, "page": 1, "per_page": 20 }
}`,
      },
      {
        method: 'GET',
        path: '/api/v1/contacts/:id',
        summary: 'Detalhes de um contato',
        description: 'Inclui contact_inboxes, labels, additional_attributes, custom_attributes.',
      },
      {
        method: 'POST',
        path: '/api/v1/contacts',
        summary: 'Criar contato',
        body: `{
  "name": "João Silva",
  "type": "person",
  "phone_number": "+5511988887777",
  "email": "joao@exemplo.com",
  "custom_attributes": { "plano": "premium" }
}`,
        notes: [
          'Para criar com avatar, envie como multipart/form-data com o campo `avatar`.',
          'Localização (cidade/estado) é inferida automaticamente a partir do DDD quando phone_number começa com +55.',
        ],
      },
      {
        method: 'PATCH',
        path: '/api/v1/contacts/:id',
        summary: 'Atualizar contato',
        description: 'Campos suportados: name, email, phone_number, blocked, custom_attributes, additional_attributes, labels, tax_id, website, industry.',
        body: `{
  "blocked": true,
  "custom_attributes": { "plano": "enterprise" }
}`,
        notes: [
          'Setar `blocked: true` faz o backend DESCARTAR mensagens futuras desse contato no WhatsApp Cloud — ele não é bloqueado na Meta, só silenciado na plataforma.',
        ],
      },
      {
        method: 'DELETE',
        path: '/api/v1/contacts/:id',
        summary: 'Deletar contato',
      },
    ],
  },
  {
    id: 'conversations',
    title: 'Conversas',
    emoji: '💬',
    overview: 'Listagem e ações em conversas. Uma conversa é a thread entre um Contato e um Inbox.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/conversations',
        summary: 'Listar conversas',
        description:
          'Params: `status` (open|resolved|pending|snoozed|all), `assignee_type`, `team_id`, `inbox_id`, `labels`, `q`, `page`. Non-admins só veem conversas dos seus inboxes.',
      },
      {
        method: 'GET',
        path: '/api/v1/conversations/:id',
        summary: 'Detalhes de uma conversa',
      },
      {
        method: 'DELETE',
        path: '/api/v1/conversations/:id',
        summary: 'Deletar conversa',
      },
    ],
  },
  {
    id: 'messages',
    title: 'Mensagens',
    emoji: '📨',
    overview: 'Envio e ações em mensagens dentro de uma conversa.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/conversations/:conversation_id/messages',
        summary: 'Listar mensagens de uma conversa',
      },
      {
        method: 'POST',
        path: '/api/v1/conversations/:conversation_id/messages',
        summary: 'Enviar mensagem',
        body: `{
  "content": "Olá, tudo bem?",
  "message_type": "outgoing",
  "private": false
}`,
        notes: [
          'Para anexos, use multipart/form-data com o campo `attachments[]` (pode mandar vários).',
          'Para template (WhatsApp Cloud), use `additional_attributes.template_params = { name, language, processed_params }`.',
        ],
      },
      {
        method: 'POST',
        path: '/api/v1/conversations/:conversation_id/messages/:id/react',
        summary: 'Reagir a uma mensagem (emoji)',
        body: `{
  "emoji": "👍"
}`,
        notes: [
          'Envia como `type: reaction` na API da Meta (aparece como reação-sticker, não mensagem de texto).',
          'Emoji vazio `""` REMOVE a reação.',
        ],
      },
      {
        method: 'DELETE',
        path: '/api/v1/conversations/:conversation_id/messages/:id',
        summary: 'Marcar mensagem como deletada (soft delete local)',
      },
    ],
  },
  {
    id: 'scheduled',
    title: 'Agendador de mensagens',
    emoji: '⏰',
    overview:
      'Agenda mensagens para serem enviadas no futuro. Um job roda a cada minuto e dispara as que chegaram na hora. Suporta anexos (multipart).',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/conversations/:conversation_id/scheduled_messages',
        summary: 'Listar mensagens agendadas de uma conversa',
      },
      {
        method: 'POST',
        path: '/api/v1/conversations/:conversation_id/scheduled_messages',
        summary: 'Agendar mensagem',
        body: `{
  "content": "Bom dia! Já conferiu aquela proposta?",
  "scheduled_at": "2026-04-23T14:00:00Z"
}`,
        notes: [
          '`scheduled_at` deve ser ISO 8601 (UTC recomendado).',
          'Para anexos: multipart com `attachments[]`.',
          'Status: pending → sent | cancelled | failed.',
        ],
      },
      {
        method: 'DELETE',
        path: '/api/v1/conversations/:conversation_id/scheduled_messages/:id',
        summary: 'Cancelar um agendamento pendente',
      },
    ],
  },
  {
    id: 'broadcasts',
    title: 'Disparador em massa (broadcasts)',
    emoji: '📣',
    overview:
      'Cria campanhas de template WhatsApp enviadas a múltiplos contatos com rate limit configurável. Respeita os limites tier da Meta (default 60 msg/min).',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/broadcast_campaigns',
        summary: 'Listar campanhas',
      },
      {
        method: 'GET',
        path: '/api/v1/broadcast_campaigns/:id',
        summary: 'Detalhe de uma campanha (com recipients)',
      },
      {
        method: 'POST',
        path: '/api/v1/broadcast_campaigns',
        summary: 'Criar campanha (rascunho)',
        body: `{
  "name": "Boas-vindas abril",
  "inbox_id": "...",
  "template_name": "boas_vindas",
  "template_language": "pt_BR",
  "rate_limit_per_minute": 60
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/broadcast_campaigns/:id/add_recipients',
        summary: 'Adicionar destinatários',
        body: `{
  "contact_ids": ["uuid-1", "uuid-2", "uuid-3"]
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/broadcast_campaigns/:id/enqueue',
        summary: 'Enviar campanha (draft → queued → running)',
      },
      {
        method: 'POST',
        path: '/api/v1/broadcast_campaigns/:id/cancel',
        summary: 'Cancelar campanha em andamento',
      },
    ],
  },
  {
    id: 'inboxes',
    title: 'Inboxes / Canais',
    emoji: '📞',
    overview: 'Canais de comunicação (WhatsApp Cloud, Evolution, Email, API, Webwidget, etc).',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/inboxes',
        summary: 'Listar inboxes do usuário',
      },
      {
        method: 'GET',
        path: '/api/v1/inboxes/:id',
        summary: 'Detalhes de um inbox',
      },
      {
        method: 'PATCH',
        path: '/api/v1/inboxes/:id',
        summary: 'Atualizar inbox (ex: credenciais Cloud API)',
        body: `{
  "phone_number": "+5511999999999",
  "channel": {
    "phone_number": "+5511999999999",
    "provider_config": {
      "phone_number_id": "...",
      "waba_id": "...",
      "api_key": "EAAG...",
      "webhook_verify_token": "..."
    }
  }
}`,
      },
    ],
  },
  {
    id: 'templates',
    title: 'Templates de mensagem',
    emoji: '📝',
    overview:
      'Templates WhatsApp Cloud. Devem ser criados/atualizados aqui E sincronizados com a Meta antes de poderem ser enviados.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/inboxes/:inbox_id/message_templates',
        summary: 'Listar templates de um inbox',
      },
      {
        method: 'POST',
        path: '/api/v1/inboxes/:inbox_id/message_templates',
        summary: 'Criar template',
        body: `{
  "name": "boas_vindas",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    { "type": "BODY", "text": "Olá {{1}}, seja bem-vindo!" }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/inboxes/:inbox_id/message_templates/sync',
        summary: 'Sincronizar templates com a Meta',
      },
    ],
  },
  {
    id: 'upload',
    title: 'Upload de arquivos',
    emoji: '📎',
    overview:
      'Upload genérico para ActiveStorage. Retorna uma URL pública que pode ser usada como header_handle em templates ou como mídia de agendamento.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/upload',
        summary: 'Upload de arquivo (multipart)',
        body: `-F "attachment=@meu_arquivo.jpg"`,
        response: `{
  "success": true,
  "data": {
    "file_url": "https://crm.../rails/active_storage/blobs/...",
    "blob_key": "...",
    "blob_id": "..."
  }
}`,
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    emoji: '📊',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/dashboard/customer',
        summary: 'Stats agregadas do dashboard',
        description:
          'Params: pipeline_id, team_id, inbox_id, user_id, contact_type (visitor|lead|customer), since, until.',
      },
      {
        method: 'GET',
        path: '/api/v1/dashboard/contacts_by_location',
        summary: 'Distribuição de contatos por estado BR',
      },
    ],
  },
  {
    id: 'checklist',
    title: 'Validation Checklist (Tutoriais)',
    emoji: '✅',
    overview:
      'Estado compartilhado da lista de validação da página /tutoriais. Toda a conta vê o mesmo.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/validation_checklist',
        summary: 'Listar itens marcados',
      },
      {
        method: 'POST',
        path: '/api/v1/validation_checklist/toggle',
        summary: 'Marcar / desmarcar item',
        body: `{
  "item_key": "chat-lead-contato",
  "checked": true
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/validation_checklist/reset',
        summary: 'Zerar lista inteira (afeta todos da conta)',
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks recebidos',
    emoji: '🔔',
    overview:
      'Endpoints que RECEBEM eventos de provedores externos (Meta WhatsApp Cloud, Evolution API, etc). Não costumam ser chamados direto — documentados para debug.',
    endpoints: [
      {
        method: 'GET',
        path: '/webhooks/whatsapp/:phone_number',
        summary: 'Verify subscription (Meta)',
      },
      {
        method: 'POST',
        path: '/webhooks/whatsapp/:phone_number',
        summary: 'Receber evento WhatsApp Cloud',
      },
      {
        method: 'POST',
        path: '/webhooks/whatsapp/evolution',
        summary: 'Receber evento Evolution API',
      },
    ],
  },
];

function buildCurl(endpoint: Endpoint, baseUrl: string, apiKey: string): string {
  const url = endpoint.path.startsWith('http')
    ? endpoint.path
    : `${baseUrl.replace(/\/$/, '')}${endpoint.path}`;
  const parts = [`curl -X ${endpoint.method} '${url}'`];
  if (apiKey) {
    parts.push(`  -H 'X-Api-Key: ${apiKey}'`);
  }
  if (endpoint.body && endpoint.method !== 'GET' && endpoint.method !== 'DELETE') {
    const isMultipart = endpoint.body.trim().startsWith('-F');
    if (isMultipart) {
      parts.push(`  ${endpoint.body.trim()}`);
    } else {
      parts.push(`  -H 'Content-Type: application/json'`);
      parts.push(`  -d '${endpoint.body.replace(/'/g, "'\\''")}'`);
    }
  }
  return parts.join(' \\\n');
}

function copyText(text: string): void {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copiado!'),
    () => toast.error('Falha ao copiar.'),
  );
}

function EndpointBlock({ endpoint, baseUrl, apiKey }: { endpoint: Endpoint; baseUrl: string; apiKey: string }) {
  const curl = useMemo(() => buildCurl(endpoint, baseUrl, apiKey), [endpoint, baseUrl, apiKey]);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={`${METHOD_COLOR[endpoint.method]} font-mono`}>{endpoint.method}</Badge>
        <code className="text-sm font-mono break-all">{endpoint.path}</code>
      </div>

      <p className="text-sm font-medium">{endpoint.summary}</p>

      {endpoint.description && (
        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
      )}

      {endpoint.notes && endpoint.notes.length > 0 && (
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
          {endpoint.notes.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      )}

      {endpoint.body && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Request body</span>
          </div>
          <pre className="text-xs p-3 rounded-md bg-muted overflow-x-auto font-mono">
            {endpoint.body}
          </pre>
        </div>
      )}

      {endpoint.response && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
          <pre className="text-xs p-3 rounded-md bg-muted overflow-x-auto font-mono">
            {endpoint.response}
          </pre>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Code2 className="h-3 w-3" />
            curl
          </span>
          <Button variant="outline" size="sm" onClick={() => copyText(curl)}>
            <Copy className="h-3 w-3 mr-1" />
            Copiar
          </Button>
        </div>
        <pre className="text-xs p-3 rounded-md bg-slate-900 text-slate-100 overflow-x-auto font-mono">
          {curl}
        </pre>
      </div>
    </div>
  );
}

export default function ApiDocs() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window === 'undefined') return 'https://api.atendai.pro';
    const host = window.location.hostname;
    const api = host.startsWith('crm.') ? host.replace(/^crm\./, 'api.') : host;
    return `${window.location.protocol}//${api}`;
  });

  // API keys CRUD state
  const [keys, setKeys] = useState<AccountApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  // The raw token is returned ONCE on create. We show it in a dedicated
  // dialog so the admin can copy before it's gone forever.
  const [revealToken, setRevealToken] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const list = await accountApiKeysService.list();
      setKeys(list);
    } catch {
      toast.error('Falha ao carregar API keys.');
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Dê um nome à chave (ex: "Integração Make").');
      return;
    }
    setCreating(true);
    try {
      const created = await accountApiKeysService.create(newKeyName.trim());
      setRevealToken(created.token || null);
      setNewKeyName('');
      setShowCreateDialog(false);
      // Auto-populate the page's curl field so the admin can immediately
      // test endpoints with the just-created key.
      if (created.token) setApiKey(created.token);
      loadKeys();
    } catch {
      toast.error('Falha ao criar API key (só admins podem criar).');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (key: AccountApiKey) => {
    if (!window.confirm(`Revogar a chave "${key.name}"? Integrações usando ela vão parar de funcionar.`)) {
      return;
    }
    try {
      await accountApiKeysService.revoke(key.id);
      toast.success('Chave revogada.');
      loadKeys();
    } catch {
      toast.error('Falha ao revogar.');
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return SECTIONS;
    const q = search.toLowerCase();
    return SECTIONS.map(section => {
      const matches = section.endpoints.filter(ep =>
        `${ep.method} ${ep.path} ${ep.summary} ${ep.description || ''}`.toLowerCase().includes(q),
      );
      return { ...section, endpoints: matches };
    }).filter(section => section.endpoints.length > 0);
  }, [search]);

  const toggle = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            API — referência
          </h1>
          <p className="text-muted-foreground mt-1">
            Endpoints principais da plataforma. Use o formulário abaixo para preencher seu token e
            base URL e copiar os curls prontos.
          </p>
        </div>

        {/* API keys management */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                API keys da conta
              </CardTitle>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova chave
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {keysLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!keysLoading && keys.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma chave criada ainda. Crie uma acima e use no header{' '}
                <code className="px-1 py-0.5 rounded bg-muted">X-Api-Key</code> das suas requisições.
              </p>
            )}
            {!keysLoading && keys.length > 0 && (
              <div className="space-y-2">
                {keys.map(key => (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-md border ${
                      key.active ? 'bg-card' : 'bg-muted/40 opacity-70'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                        {key.name}
                        {!key.active && (
                          <Badge variant="secondary" className="text-xs">
                            Revogada
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        evo_••••••••{key.last4}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Criada por {key.created_by?.name || '—'}
                        {key.last_used_at && ` · Último uso ${new Date(key.last_used_at).toLocaleString('pt-BR')}`}
                      </div>
                    </div>
                    {key.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevoke(key)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Base URL
                </label>
                <Input
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.exemplo.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  API key (X-Api-Key — os curls abaixo usam este valor)
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="evo_..."
                />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar endpoint (ex: reaction, broadcast, scheduled)…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Autentique suas requests com o header{' '}
              <code className="px-1 py-0.5 rounded bg-muted">X-Api-Key: &lt;token&gt;</code>. As
              respostas seguem o envelope{' '}
              <code className="px-1 py-0.5 rounded bg-muted">{`{ success, data, meta?, message? }`}</code>.
            </p>
          </CardContent>
        </Card>

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum endpoint encontrado para "{search}".
            </CardContent>
          </Card>
        )}

        {filtered.map(section => {
          const isCollapsed = !!collapsed[section.id];
          return (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="w-full flex items-center justify-between group"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                    <span className="text-xl leading-none">{section.emoji}</span>
                    <span className="group-hover:text-primary transition-colors">
                      {section.title}
                    </span>
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {section.endpoints.length} endpoint
                    {section.endpoints.length > 1 ? 's' : ''}
                  </Badge>
                </button>
              </CardHeader>
              {!isCollapsed && (
                <CardContent className="space-y-4">
                  {section.overview && (
                    <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
                      {section.overview}
                    </p>
                  )}
                  {section.endpoints.map((ep, idx) => (
                    <EndpointBlock
                      key={`${ep.method}-${ep.path}-${idx}`}
                      endpoint={ep}
                      baseUrl={baseUrl}
                      apiKey={apiKey}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}

        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground flex items-start gap-2">
            <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Esta página cobre os endpoints mais usados. Para a lista completa, consulte o arquivo{' '}
              <code className="px-1 py-0.5 rounded bg-muted">config/routes.rb</code> do backend.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Create key dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova API key</DialogTitle>
            <DialogDescription>
              Dê um nome descritivo pra lembrar onde vai usar. O token será mostrado uma única vez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="key-name">Nome</Label>
            <Input
              id="key-name"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder='ex: "Integração Make" ou "Script de backup"'
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateKey} loading={creating}>
              Criar chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal raw token dialog (shown once after create) */}
      <Dialog open={!!revealToken} onOpenChange={open => !open && setRevealToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Chave criada — copie agora
            </DialogTitle>
            <DialogDescription>
              Essa é a única vez que o token completo será mostrado. Copie e guarde em um local
              seguro (gerenciador de senhas, cofre de CI, etc).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <pre className="text-xs p-3 rounded-md bg-slate-900 text-slate-100 font-mono break-all whitespace-pre-wrap">
              {revealToken}
            </pre>
            <Button
              className="w-full"
              onClick={() => {
                if (revealToken) copyText(revealToken);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar token
            </Button>
            <p className="text-xs text-muted-foreground">
              Use no header <code className="px-1 py-0.5 rounded bg-muted">X-Api-Key</code> de
              qualquer request para <code>/api/v1/*</code>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevealToken(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
