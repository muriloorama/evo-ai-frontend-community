import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import {
  Loader2,
  Plug,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Facebook,
  ExternalLink,
} from 'lucide-react';
import {
  trackingService,
  type MetaAdAccount,
  type MetaTokenValidation,
} from '@/services/reports/trackingService';

interface MetaAdsConfigCardProps {
  onSyncCompleted?: () => void;
}

const MetaAdsConfigCard = ({ onSyncCompleted }: MetaAdsConfigCardProps) => {
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await trackingService.listMetaAccounts();
      setAccounts(list);
    } catch (e) {
      console.error('Error loading meta accounts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async (id: string) => {
    try {
      await trackingService.syncMetaNow(id);
      toast.success('Sincronização iniciada — atualizando dados em alguns segundos…');
      setTimeout(() => {
        load();
        onSyncCompleted?.();
      }, 4000);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao sincronizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Desconectar esta conta do Meta? O histórico de investimentos sincronizados será mantido.')) return;
    try {
      await trackingService.deleteMetaAccount(id);
      toast.success('Conta desconectada');
      load();
    } catch {
      toast.error('Erro ao desconectar');
    }
  };

  const hasConnectedAccount = accounts.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" /> Integração Meta Ads
          </CardTitle>
          <CardDescription>
            {hasConnectedAccount
              ? 'Você já tem uma conta Meta conectada. Desconecte abaixo para trocar por outra.'
              : 'Sincroniza investimento real das campanhas Meta/Instagram'}
          </CardDescription>
        </div>
        {!hasConnectedAccount && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plug className="h-3.5 w-3.5 mr-1.5" /> Conectar conta
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Carregando…
          </div>
        )}

        {!loading && accounts.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Nenhuma conta Meta conectada. Conecte um token (60 dias) para puxar gastos automaticamente.
          </div>
        )}

        {!loading &&
          accounts.map(acc => (
            <div
              key={acc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border border-border bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{acc.ad_account_name || acc.ad_account_id}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {acc.ad_account_id}
                  </Badge>
                  {acc.token_expired ? (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Token expirado
                    </Badge>
                  ) : acc.token_expiring_soon ? (
                    <Badge className="text-[10px] bg-amber-500">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Expira em breve
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Ativa
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                  {acc.business_name && <span>{acc.business_name}</span>}
                  {acc.last_sync_at && (
                    <span>
                      Última sync: {new Date(acc.last_sync_at).toLocaleString('pt-BR')} ·{' '}
                      <span className={acc.last_sync_status === 'ok' ? 'text-emerald-600' : 'text-red-600'}>
                        {acc.last_sync_status === 'ok'
                          ? `${acc.last_sync_campaigns_count} campanhas`
                          : acc.last_sync_error || 'erro'}
                      </span>
                    </span>
                  )}
                  {!acc.last_sync_at && <span className="italic">Aguardando primeira sincronização</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => handleSync(acc.id)}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Sincronizar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(acc.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
      </CardContent>

      <ConnectMetaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConnected={() => {
          setDialogOpen(false);
          load();
          onSyncCompleted?.();
        }}
      />
    </Card>
  );
};

interface ConnectMetaDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

const ConnectMetaDialog = ({ open, onClose, onConnected }: ConnectMetaDialogProps) => {
  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<MetaTokenValidation | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setToken('');
      setValidation(null);
      setSelectedAccountId('');
    }
  }, [open]);

  const handleValidate = async () => {
    if (!token.trim()) {
      toast.error('Cole o token de acesso');
      return;
    }
    setValidating(true);
    try {
      const result = await trackingService.validateMetaToken(token.trim());
      setValidation(result);
      if (result.ok && result.ad_accounts && result.ad_accounts.length > 0) {
        setSelectedAccountId(result.ad_accounts[0].id);
        toast.success(`${result.ad_accounts.length} conta(s) encontrada(s)`);
      } else if (result.ok) {
        toast.error('Token válido mas sem contas de anúncios acessíveis');
      } else {
        toast.error(result.error || 'Token inválido');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao validar token');
    } finally {
      setValidating(false);
    }
  };

  const handleConnect = async () => {
    if (!validation?.ok || !selectedAccountId) return;
    const chosen = validation.ad_accounts?.find(a => a.id === selectedAccountId);
    if (!chosen) return;

    setSaving(true);
    try {
      // Token long-lived = 60 days
      const expires = new Date();
      expires.setDate(expires.getDate() + 60);

      await trackingService.createMetaAccount({
        access_token: token.trim(),
        ad_account_id: chosen.id,
        ad_account_name: chosen.name,
        business_name: chosen.business_name || undefined,
        currency: chosen.currency || 'BRL',
        token_expires_at: expires.toISOString(),
      });
      toast.success('Conta Meta conectada — sincronização iniciada');
      onConnected();
    } catch (e: any) {
      toast.error(e?.response?.data?.errors?.join(', ') || 'Erro ao conectar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" /> Conectar conta Meta Ads
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">Como obter o token (válido por 60 dias):</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>
                Acesse o{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1"
                >
                  Graph API Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Em "Permissions", adicione: <code>ads_read</code>, <code>business_management</code> e{' '}
                <code>read_insights</code>
              </li>
              <li>Clique em "Generate Access Token" e confirme as permissões (token de curta duração, ~1h)</li>
              <li>
                <span className="font-medium text-foreground">Depure para estender para 60 dias:</span> abra o{' '}
                <a
                  href="https://developers.facebook.com/tools/debug/accesstoken/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1"
                >
                  Access Token Debugger
                  <ExternalLink className="h-3 w-3" />
                </a>
                , cole o token e clique em "Debug"
              </li>
              <li>
                No rodapé, clique em <span className="font-medium">"Extend Access Token"</span>, confirme sua senha e
                copie o novo token (long-lived)
              </li>
              <li>Cole o token de 60 dias no campo abaixo</li>
            </ol>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Token de acesso (long-lived)</Label>
            <textarea
              className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-xs font-mono"
              placeholder="EAAxxxxxxxxx..."
              value={token}
              onChange={e => setToken(e.target.value)}
              disabled={validating || saving}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleValidate}
              disabled={validating || saving || !token.trim()}
            >
              {validating ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : null}
              Validar token
            </Button>
          </div>

          {validation?.ok && validation.ad_accounts && validation.ad_accounts.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              <Label className="text-xs">Selecione a conta de anúncios</Label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
              >
                {validation.ad_accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id}) {a.business_name ? `· ${a.business_name}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-600 mt-1">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                Conectado como {validation.user?.name}
              </p>
            </div>
          )}

          {validation && !validation.ok && (
            <div className="text-xs text-red-600 bg-red-50 rounded-md p-2">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {validation.error || 'Token inválido'}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!validation?.ok || !selectedAccountId || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetaAdsConfigCard;
