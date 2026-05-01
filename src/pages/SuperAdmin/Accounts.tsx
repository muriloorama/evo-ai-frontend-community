import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@evoapi/design-system';
import { Plus, Users, Pencil } from 'lucide-react';
import {
  listAccounts,
  createAccount,
  updateAccount,
  AdminAccount,
  CreateAccountPayload
} from '@/services/admin/adminService';
import {
  AccountFeatureSnapshot,
  DEFAULT_SNAPSHOT,
  AccountLimits,
  AccountAi,
  AccountChannels,
  AccountFeatureFlags
} from '@/types/admin/accounts';
import {
  LimitsTab,
  AiTab,
  ChannelsTab,
  FeaturesTab
} from '@/components/superadmin/account-form';

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; accountId: string };

type AccountFormState = {
  // Aba "Geral" — campos básicos.
  name: string;
  domain: string;
  support_email: string;
  locale: string;
  status: 'active' | 'suspended' | 'archived';
  // Abas "Limites" / "AI" / "Canais" / "Funcionalidades" — slices do snapshot.
  limits: AccountLimits;
  ai: AccountAi;
  channels: AccountChannels;
  features: AccountFeatureFlags;
};

const blankForm = (): AccountFormState => ({
  name: '',
  domain: '',
  support_email: '',
  locale: 'pt-BR',
  status: 'active',
  limits:   { ...DEFAULT_SNAPSHOT.limits },
  ai:       { ...DEFAULT_SNAPSHOT.ai },
  channels: { ...DEFAULT_SNAPSHOT.channels },
  features: { ...DEFAULT_SNAPSHOT.features }
});

// Hidrata o form usando o snapshot que vem do backend (defaults + overrides
// já mergados). Isso garante que workspaces sem overrides aparecem com
// todos os toggles ligados — alinhado com a regra "defaults = TUDO LIBERADO".
const hydrateFromAccount = (acc: AdminAccount): AccountFormState => {
  const snap: AccountFeatureSnapshot = acc.feature_snapshot ?? DEFAULT_SNAPSHOT;
  return {
    name:          acc.name,
    domain:        acc.domain || '',
    support_email: acc.support_email || '',
    locale:        acc.locale || 'pt-BR',
    status:        (acc.status as AccountFormState['status']) || 'active',
    limits:        { ...DEFAULT_SNAPSHOT.limits,   ...snap.limits },
    ai:            { ...DEFAULT_SNAPSHOT.ai,       ...snap.ai },
    channels:      { ...DEFAULT_SNAPSHOT.channels, ...snap.channels },
    features:      { ...DEFAULT_SNAPSHOT.features, ...snap.features }
  };
};

// Monta o payload final no formato esperado pelo Account model:
//   features = { features: {...}, ai: {...}, channels: {...} }
//   settings = { limits: {...} }
// (essa separação espelha a convenção do Account no auth-service: o
//  primeiro JSONB carrega os toggles, o segundo carrega caps numéricos).
const buildPayload = (form: AccountFormState): Partial<CreateAccountPayload> => ({
  name:          form.name.trim(),
  domain:        form.domain?.trim() || undefined,
  support_email: form.support_email?.trim() || undefined,
  locale:        form.locale?.trim() || undefined,
  status:        form.status?.trim() || undefined,
  features: {
    features: form.features,
    ai:       form.ai,
    channels: form.channels
  },
  settings: {
    limits: form.limits
  }
});

const TAB_VALUES = ['general', 'limits', 'ai', 'channels', 'features'] as const;
type TabValue = typeof TAB_VALUES[number];

/**
 * Super-admin console — lists every account on the platform and lets the
 * operator create / edit one (limits, AI, channels, product features).
 * Gated by SuperAdminRoute. Backed by the Auth service's
 * /api/v1/admin/accounts endpoints.
 */
export default function SuperAdminAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<DialogMode>({ kind: 'closed' });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AccountFormState>(blankForm);
  const [activeTab, setActiveTab] = useState<TabValue>('general');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setForm(blankForm());
    setActiveTab('general');
    setFormError(null);
    setDialogMode({ kind: 'create' });
  };

  const openEdit = (acc: AdminAccount) => {
    setForm(hydrateFromAccount(acc));
    setActiveTab('general');
    setFormError(null);
    setDialogMode({ kind: 'edit', accountId: acc.id });
  };

  const closeDialog = () => setDialogMode({ kind: 'closed' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAccounts();
      setAccounts(data);
    } catch (err) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Falha ao carregar accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório');
      setActiveTab('general');
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = buildPayload(form);

    try {
      if (dialogMode.kind === 'edit') {
        await updateAccount(dialogMode.accountId, payload);
      } else {
        await createAccount(payload as CreateAccountPayload);
      }
      closeDialog();
      await load();
    } catch (err) {
      const e = err as {
        response?: {
          data?: {
            error?: {
              message?: string;
              details?: Array<{ full_messages?: string[] }>;
            };
          };
        };
      };
      const details = e?.response?.data?.error?.details;
      const firstDetail = Array.isArray(details) && details[0]?.full_messages?.[0];
      setFormError(firstDetail || e?.response?.data?.error?.message || 'Falha ao salvar workspace');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          <Button variant="default" size="sm">Workspaces</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/users')}>
            Usuários
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Workspaces</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie todas as contas da plataforma. Apenas super-admins acessam esta tela.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo workspace
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Slug</th>
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Domain</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Membros</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!loading && accounts.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum workspace encontrado</td></tr>
              )}
              {!loading && accounts.map(acc => (
                <tr key={acc.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{acc.name}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{acc.slug}</td>
                  <td
                    className="p-3 text-muted-foreground font-mono text-xs cursor-pointer select-all"
                    title={`Clique para copiar: ${acc.id}`}
                    onClick={() => navigator.clipboard?.writeText(acc.id)}
                  >
                    {acc.id.substring(0, 8)}…
                  </td>
                  <td className="p-3 text-muted-foreground">{acc.domain || '—'}</td>
                  <td className="p-3">
                    <span className={
                      'inline-block px-2 py-0.5 rounded text-xs ' +
                      (acc.status === 'active'
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400')
                    }>
                      {acc.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">{acc.member_count}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => openEdit(acc)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => navigate(`/super-admin/accounts/${acc.id}/members`)}
                      >
                        <Users className="h-4 w-4" />
                        Membros
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogMode.kind !== 'closed'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {dialogMode.kind === 'edit' ? 'Editar workspace' : 'Novo workspace'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 overflow-hidden flex flex-col">
            {/*
              Tab list editorial: sem fundo "ativo" gritante, ativo
              destacado por linha embaixo + cor primária no texto.
              Mantém os tokens do design system (text-foreground / muted-foreground / primary).
            */}
            <TabsList className="bg-transparent justify-start gap-6 px-0 border-b border-border rounded-none h-auto pb-0">
              <TabsTrigger
                value="general"
                className="bg-transparent border-0 rounded-none px-0 pb-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px"
              >
                Geral
              </TabsTrigger>
              <TabsTrigger
                value="limits"
                className="bg-transparent border-0 rounded-none px-0 pb-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px"
              >
                Limites
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="bg-transparent border-0 rounded-none px-0 pb-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px"
              >
                AI
              </TabsTrigger>
              <TabsTrigger
                value="channels"
                className="bg-transparent border-0 rounded-none px-0 pb-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px"
              >
                Canais
              </TabsTrigger>
              <TabsTrigger
                value="features"
                className="bg-transparent border-0 rounded-none px-0 pb-2.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px"
              >
                Funcionalidades
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto py-4 pr-1 -mr-1 flex-1">
              <TabsContent value="general" className="space-y-4 mt-0">
                <div>
                  <Label htmlFor="acc-name">Nome *</Label>
                  <Input
                    id="acc-name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <Label htmlFor="acc-domain">Domain (opcional)</Label>
                  <Input
                    id="acc-domain"
                    value={form.domain}
                    onChange={e => setForm({ ...form, domain: e.target.value })}
                    placeholder="cliente.atendai.pro"
                  />
                </div>
                <div>
                  <Label htmlFor="acc-email">E-mail de suporte</Label>
                  <Input
                    id="acc-email"
                    type="email"
                    value={form.support_email}
                    onChange={e => setForm({ ...form, support_email: e.target.value })}
                    placeholder="suporte@cliente.com"
                  />
                </div>
                <div>
                  <Label htmlFor="acc-locale">Locale</Label>
                  <Input
                    id="acc-locale"
                    value={form.locale}
                    onChange={e => setForm({ ...form, locale: e.target.value })}
                    placeholder="pt-BR"
                  />
                </div>
                {dialogMode.kind === 'edit' && (
                  <div>
                    <Label>Status</Label>
                    <div className="flex gap-2 mt-1.5">
                      {(['active', 'suspended', 'archived'] as const).map(s => {
                        const checked = form.status === s;
                        return (
                          <label
                            key={s}
                            className={
                              'flex-1 text-center py-2 px-3 border rounded-md cursor-pointer capitalize text-sm ' +
                              (checked ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:bg-accent')
                            }
                          >
                            <input
                              type="radio"
                              name="status"
                              value={s}
                              checked={checked}
                              onChange={() => setForm({ ...form, status: s })}
                              className="sr-only"
                            />
                            {s === 'active' ? 'Ativo' : s === 'suspended' ? 'Suspenso' : 'Arquivado'}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="limits" className="mt-0">
                <LimitsTab
                  value={form.limits}
                  onChange={(limits) => setForm({ ...form, limits })}
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <AiTab
                  value={form.ai}
                  onChange={(ai) => setForm({ ...form, ai })}
                />
              </TabsContent>

              <TabsContent value="channels" className="mt-0">
                <ChannelsTab
                  value={form.channels}
                  onChange={(channels) => setForm({ ...form, channels })}
                />
              </TabsContent>

              <TabsContent value="features" className="mt-0">
                <FeaturesTab
                  value={form.features}
                  onChange={(features) => setForm({ ...form, features })}
                />
              </TabsContent>
            </div>
          </Tabs>

          {formError && (
            <div className="text-sm text-destructive mt-2">{formError}</div>
          )}

          <DialogFooter className="border-t border-border pt-4 mt-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving
                ? (dialogMode.kind === 'edit' ? 'Salvando...' : 'Criando...')
                : (dialogMode.kind === 'edit' ? 'Salvar alterações' : 'Criar workspace')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
