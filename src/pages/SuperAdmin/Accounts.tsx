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
  Label
} from '@evoapi/design-system';
import { Plus, Users, Pencil } from 'lucide-react';
import {
  listAccounts,
  createAccount,
  updateAccount,
  AdminAccount,
  CreateAccountPayload
} from '@/services/admin/adminService';

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; accountId: string };

const EMPTY_FORM: CreateAccountPayload & { status?: string } = {
  name: '',
  domain: '',
  support_email: '',
  locale: 'pt-BR',
  status: 'active'
};

/**
 * Super-admin console — lists every account on the platform and lets the
 * operator create a new one. Gated by SuperAdminRoute. Backed by the Auth
 * service's /api/v1/admin/accounts endpoints (Fase 3.2).
 */
export default function SuperAdminAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<DialogMode>({ kind: 'closed' });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateAccountPayload & { status?: string }>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogMode({ kind: 'create' });
  };

  const openEdit = (acc: AdminAccount) => {
    setForm({
      name:          acc.name,
      domain:        acc.domain || '',
      support_email: acc.support_email || '',
      locale:        acc.locale || 'pt-BR',
      status:        acc.status || 'active'
    });
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
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Falha ao carregar accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório');
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload: Partial<CreateAccountPayload & { status?: string }> = {
      name:          form.name.trim(),
      domain:        form.domain?.trim() || undefined,
      support_email: form.support_email?.trim() || undefined,
      locale:        form.locale?.trim() || undefined,
      status:        form.status?.trim() || undefined
    };

    try {
      if (dialogMode.kind === 'edit') {
        await updateAccount(dialogMode.accountId, payload);
      } else {
        await createAccount(payload as CreateAccountPayload);
      }
      closeDialog();
      await load();
    } catch (err: any) {
      const details = err?.response?.data?.error?.details;
      const firstDetail = Array.isArray(details) && details[0]?.full_messages?.[0];
      setFormError(firstDetail || err?.response?.data?.error?.message || 'Falha ao salvar workspace');
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode.kind === 'edit' ? 'Editar workspace' : 'Novo workspace'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                  {['active', 'suspended', 'archived'].map(s => {
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
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
          </div>

          <DialogFooter>
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
