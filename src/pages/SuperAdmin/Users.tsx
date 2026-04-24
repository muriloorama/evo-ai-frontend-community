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
import { ArrowLeft, Plus, Search, Shield, ShieldOff, Trash2, Copy, Check } from 'lucide-react';
import {
  listUsers,
  createUser,
  grantSuperAdmin,
  revokeSuperAdmin,
  deleteUser,
  AdminUser
} from '@/services/admin/adminService';
import { useAuthStore } from '@/store/authStore';

/**
 * Super-admin user directory. Lists every user on the platform and lets the
 * operator create new ones (optionally granting super_admin on create) or
 * toggle the super_admin role on existing users.
 * Backed by /api/v1/admin/users (Fase 3.9).
 */
export default function SuperAdminUsers() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email:        '',
    name:         '',
    super_admin:  false,
    send_invite:  true
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // After a successful create the backend returns a temporary password. We
  // surface it in a modal so the super-admin can copy & share it out-of-band.
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    invitedByEmail: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async (term?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers(term);
      setUsers(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Debounced search: wait 300ms after last keystroke.
  useEffect(() => {
    const handle = setTimeout(() => load(search.trim() || undefined), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const openCreate = () => {
    setForm({ email: '', name: '', super_admin: false, send_invite: true });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.email.trim()) {
      setFormError('E-mail é obrigatório');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await createUser({
        email:       form.email.trim(),
        name:        form.name.trim() || undefined,
        super_admin: form.super_admin,
        send_invite: form.send_invite
      });
      setDialogOpen(false);
      if (result.temporary_password) {
        setCreatedCredentials({
          email:          result.user.email,
          password:       result.temporary_password,
          invitedByEmail: form.send_invite
        });
      }
      await load(search.trim() || undefined);
    } catch (err: any) {
      setFormError(err?.response?.data?.error?.message || 'Falha ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `E-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (http or sandbox) — fall back to select + manual copy
      alert(text);
    }
  };

  const toggleSuperAdmin = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      if (user.super_admin) {
        await revokeSuperAdmin(user.id);
      } else {
        await grantSuperAdmin(user.id);
      }
      await load(search.trim() || undefined);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Falha ao alterar permissão');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      alert('Você não pode excluir seu próprio usuário');
      return;
    }
    if (!window.confirm(`Excluir o usuário ${user.email}? Essa ação remove ele de todos os workspaces.`)) return;
    setBusyId(user.id);
    try {
      await deleteUser(user.id);
      await load(search.trim() || undefined);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Falha ao excluir usuário');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
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
            <h1 className="text-2xl font-semibold">Usuários</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os usuários da plataforma. Use "Convidar membro" nos workspaces para vincular usuários a uma conta específica.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por e-mail ou nome..."
            className="pl-9"
          />
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
                <th className="text-center p-3 font-medium">Workspaces</th>
                <th className="text-center p-3 font-medium">Super Admin</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              )}
              {!loading && users.map(u => {
                const isSelf = u.id === currentUser?.id;
                const isBusy = busyId === u.id;
                return (
                  <tr key={u.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 text-center">{u.account_count}</td>
                    <td className="p-3 text-center">
                      {u.super_admin
                        ? <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">Sim</span>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy || isSelf}
                          onClick={() => toggleSuperAdmin(u)}
                          className="gap-1"
                        >
                          {u.super_admin
                            ? <><ShieldOff className="h-4 w-4" /> Revogar</>
                            : <><Shield className="h-4 w-4" /> Tornar Super</>
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy || isSelf}
                          onClick={() => handleDelete(u)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuário criado</DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {createdCredentials.invitedByEmail
                  ? 'Um e-mail foi enviado para o usuário definir a própria senha. Se preferir, você também pode passar as credenciais abaixo manualmente.'
                  : 'Copie a senha temporária abaixo e envie ao usuário. Ele poderá alterá-la depois no perfil.'}
              </p>
              <div className="space-y-2 p-3 border rounded-md bg-muted/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground w-16">E-mail</span>
                  <span className="font-mono text-sm flex-1 truncate">{createdCredentials.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground w-16">Senha</span>
                  <span className="font-mono text-sm flex-1 select-all">{createdCredentials.password}</span>
                </div>
              </div>
              <Button onClick={copyCredentials} className="w-full gap-2" variant="outline">
                {copied ? <><Check className="h-4 w-4 text-primary" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar e-mail + senha</>}
              </Button>
              <p className="text-xs text-muted-foreground">
                A senha não será mostrada novamente. Se perder, reset pela tela de login.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedCredentials(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="user-email">E-mail *</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="nome@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="user-name">Nome</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.super_admin}
                onChange={e => setForm({ ...form, super_admin: e.target.checked })}
              />
              <div>
                <div className="font-medium">Tornar Super Admin</div>
                <div className="text-xs text-muted-foreground">
                  Acesso global a todos os workspaces e ao painel de administração.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.send_invite}
                onChange={e => setForm({ ...form, send_invite: e.target.checked })}
              />
              <div>
                <div className="font-medium">Enviar e-mail para definir senha</div>
                <div className="text-xs text-muted-foreground">
                  O usuário recebe um link para criar a própria senha.
                </div>
              </div>
            </label>
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Criando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
