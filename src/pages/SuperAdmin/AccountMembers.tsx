import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import {
  getAccount,
  listMemberships,
  inviteMember,
  revokeMember,
  listUsers,
  AdminAccount,
  AdminMembership,
  AdminUser,
  InviteMemberPayload
} from '@/services/admin/adminService';

/**
 * Super-admin page: list members of a given account and invite / revoke them.
 * Role options:
 *   - super_admin (global, not scoped to this account) — platform operator
 *   - account_owner (scoped) — full access to this account
 *   - agent (scoped) — regular user of this account
 */
const USER_ROLES: Array<{ key: string; label: string; description: string }> = [
  { key: 'super_admin',   label: 'Super Admin',   description: 'Acesso global a todos os workspaces' },
  { key: 'account_owner', label: 'Administrador', description: 'Acesso total a este workspace' },
  { key: 'agent',         label: 'Usuário',       description: 'Acesso operacional a este workspace' }
];

export default function SuperAdminAccountMembers() {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();

  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InviteMemberPayload>({ email: '', role_key: 'agent', name: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Email autocomplete over existing users
  const [suggestions, setSuggestions] = useState<AdminUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const [acc, mems] = await Promise.all([
        getAccount(accountId),
        listMemberships(accountId)
      ]);
      setAccount(acc);
      setMemberships(mems);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Falha ao carregar workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [accountId]);

  // Debounced search against /admin/users?search= while the invite dialog is
  // open. Skip when the user field is empty or very short to avoid noisy
  // requests. Existing memberships are filtered out — no point suggesting
  // someone who is already a member.
  useEffect(() => {
    if (!dialogOpen) return;
    const term = form.email.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    const handle = setTimeout(async () => {
      try {
        const existingIds = new Set(memberships.map(m => m.user.id));
        const users = await listUsers(term);
        setSuggestions(users.filter(u => !existingIds.has(u.id)));
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [form.email, dialogOpen, memberships]);

  const handleInvite = async () => {
    if (!accountId) return;
    if (!form.email.trim()) {
      setFormError('E-mail é obrigatório');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await inviteMember(accountId, {
        email:    form.email.trim(),
        role_key: form.role_key,
        name:     form.name?.trim() || undefined
      });
      setDialogOpen(false);
      setForm({ email: '', role_key: 'agent', name: '' });
      await load();
    } catch (err: any) {
      const details = err?.response?.data?.error?.details;
      const firstDetail = Array.isArray(details) && details[0]?.full_messages?.[0];
      setFormError(firstDetail || err?.response?.data?.error?.message || 'Falha ao convidar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!accountId) return;
    if (!window.confirm('Remover o acesso deste usuário ao workspace?')) return;
    setRevokingId(userId);
    try {
      await revokeMember(accountId, userId);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Falha ao revogar acesso');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/super-admin/accounts')}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">
              {account?.name || 'Workspace'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {account?.slug && <span className="font-mono">{account.slug}</span>}
              {account?.domain && <> · {account.domain}</>}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar membro
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
                <th className="text-left p-3 font-medium">E-mail</th>
                <th className="text-left p-3 font-medium">Papel</th>
                <th className="text-left p-3 font-medium">Entrada</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!loading && memberships.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum membro ainda</td></tr>
              )}
              {!loading && memberships.map(m => (
                <tr key={m.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{m.user.name}</td>
                  <td className="p-3 text-muted-foreground">{m.user.email}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                      {m.role.name}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    Adicionado em {new Date(m.granted_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(m.user.id)}
                      disabled={revokingId === m.user.id}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      {revokingId === m.user.id ? 'Removendo...' : 'Remover'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Label htmlFor="member-email">E-mail *</Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="usuario@cliente.com (digite para buscar)"
                autoComplete="off"
              />
              {showSuggestions && form.email.trim().length >= 2 && (suggestions.length > 0 || loadingSuggestions) && (
                <div className="absolute left-0 right-0 top-full mt-1 border rounded-md bg-popover shadow-md z-10 max-h-60 overflow-y-auto">
                  {loadingSuggestions && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                  )}
                  {!loadingSuggestions && suggestions.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={() => {
                        setForm({ ...form, email: u.email, name: u.name });
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.name}</div>
                      </div>
                      {u.super_admin && (
                        <span className="text-[10px] uppercase tracking-wide text-primary">super</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="member-name">Nome (opcional)</Label>
              <Input
                id="member-name"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Papel</Label>
              <div className="space-y-2 mt-1.5">
                {USER_ROLES.map(r => {
                  const checked = form.role_key === r.key;
                  return (
                    <label
                      key={r.key}
                      className={
                        'flex items-start gap-2 p-2 border rounded-md cursor-pointer ' +
                        (checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent')
                      }
                    >
                      <input
                        type="radio"
                        name="role_key"
                        value={r.key}
                        checked={checked}
                        onChange={() => setForm({ ...form, role_key: r.key })}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.label}</div>
                        <div className="text-xs text-muted-foreground">{r.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se o e-mail já estiver cadastrado, o usuário ganha acesso imediato. Caso contrário, é criado e recebe um e-mail para definir a senha.
            </p>
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={saving}>
              {saving ? 'Enviando...' : 'Convidar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
