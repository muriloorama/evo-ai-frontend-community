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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@evoapi/design-system';
import { Megaphone, Play, StopCircle, Users } from 'lucide-react';
import {
  broadcastCampaignsService,
  type BroadcastCampaign,
  type BroadcastStatus,
} from '@/services/broadcastCampaignsService';
import InboxesService from '@/services/channels/inboxesService';

const STATUS_STYLES: Record<BroadcastStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-foreground' },
  queued: { label: 'Na fila', className: 'bg-blue-500 text-white' },
  running: { label: 'Enviando', className: 'bg-amber-500 text-white' },
  completed: { label: 'Concluída', className: 'bg-green-600 text-white' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-500 text-white' },
  failed: { label: 'Falhou', className: 'bg-red-600 text-white' },
};

function StatusBadge({ status }: { status: BroadcastStatus }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return <Badge className={config.className}>{config.label}</Badge>;
}

export default function BroadcastsPage() {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [inboxes, setInboxes] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await broadcastCampaignsService.list();
      setCampaigns(list);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar campanhas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const response = await InboxesService.list();
        const list =
          (response.data as unknown as Array<{ id: string; name: string }>) ||
          [];
        setInboxes(list);
      } catch {
        /* non-critical; create form will show empty select */
      }
    })();
  }, [load]);

  const handleEnqueue = async (campaign: BroadcastCampaign) => {
    try {
      await broadcastCampaignsService.enqueue(campaign.id);
      toast.success('Campanha enviada para a fila.');
      load();
    } catch {
      toast.error('Falha ao enfileirar.');
    }
  };

  const handleCancel = async (campaign: BroadcastCampaign) => {
    if (!window.confirm(`Cancelar a campanha "${campaign.name}"?`)) return;
    try {
      await broadcastCampaignsService.cancel(campaign.id);
      toast.success('Campanha cancelada.');
      load();
    } catch {
      toast.error('Falha ao cancelar.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Disparos em massa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie um template aprovado para múltiplos contatos respeitando o limite da Meta.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Nova campanha</Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!loading && campaigns.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Você ainda não criou nenhuma campanha.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {campaigns.map(campaign => (
          <Card key={campaign.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{campaign.name}</CardTitle>
                <StatusBadge status={campaign.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Template</div>
                  <div className="font-mono text-xs">
                    {campaign.template_name} ({campaign.template_language})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Destinatários</div>
                  <div>
                    <Users className="inline h-3 w-3 mr-1" />
                    {campaign.sent_count}/{campaign.total_recipients}
                    {campaign.failed_count > 0 && (
                      <span className="text-red-500 ml-1">({campaign.failed_count} falha)</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Rate limit</div>
                  <div>{campaign.rate_limit_per_minute}/min</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Progresso</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${campaign.progress_percent}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums">{campaign.progress_percent}%</span>
                  </div>
                </div>
              </div>

              {campaign.error_message && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Erro: {campaign.error_message}
                </p>
              )}

              <div className="flex gap-2 pt-2 border-t">
                {campaign.status === 'draft' && (
                  <AddRecipientsButton campaign={campaign} onAdded={load} />
                )}
                {campaign.status === 'draft' && campaign.total_recipients > 0 && (
                  <Button size="sm" onClick={() => handleEnqueue(campaign)}>
                    <Play className="h-4 w-4 mr-1" />
                    Enviar
                  </Button>
                )}
                {(campaign.status === 'queued' || campaign.status === 'running') && (
                  <Button variant="destructive" size="sm" onClick={() => handleCancel(campaign)}>
                    <StopCircle className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate && (
        <CreateCampaignDialog
          inboxes={inboxes}
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignDialog({
  inboxes,
  open,
  onOpenChange,
  onCreated,
}: {
  inboxes: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    inbox_id: inboxes[0]?.id ?? '',
    template_name: '',
    template_language: 'pt_BR',
    rate_limit_per_minute: 60,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name || !form.inbox_id || !form.template_name) {
      toast.error('Preencha nome, canal e nome do template.');
      return;
    }
    setSaving(true);
    try {
      await broadcastCampaignsService.create(form);
      toast.success('Campanha criada como rascunho.');
      onCreated();
    } catch {
      toast.error('Falha ao criar campanha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>
            A campanha fica como rascunho até você adicionar destinatários e clicar em "Enviar".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="campaign-name">Nome</Label>
            <Input
              id="campaign-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="campaign-inbox">Canal</Label>
            <Select
              value={form.inbox_id}
              onValueChange={value => setForm(f => ({ ...f, inbox_id: value }))}
            >
              <SelectTrigger id="campaign-inbox">
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                {inboxes.map(inbox => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="campaign-template">Template aprovado (name)</Label>
              <Input
                id="campaign-template"
                value={form.template_name}
                onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))}
                placeholder="ex: boas_vindas"
              />
            </div>
            <div>
              <Label htmlFor="campaign-lang">Idioma</Label>
              <Input
                id="campaign-lang"
                value={form.template_language}
                onChange={e => setForm(f => ({ ...f, template_language: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="campaign-rate">Rate limit (msg/min)</Label>
            <Input
              id="campaign-rate"
              type="number"
              min={1}
              max={600}
              value={form.rate_limit_per_minute}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  rate_limit_per_minute: Number(e.target.value) || 60,
                }))
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Meta libera 80 msg/s no tier 1 (4800/min). Para conservar, recomendo começar com 60/min.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Criar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRecipientsButton({
  campaign,
  onAdded,
}: {
  campaign: BroadcastCampaign;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [saving, setSaving] = useState(false);

  const ids = useMemo(
    () =>
      raw
        .split(/[\s,;]+/)
        .map(s => s.trim())
        .filter(Boolean),
    [raw],
  );

  const submit = async () => {
    if (ids.length === 0) {
      toast.error('Cole uma lista de contact_ids separados por vírgula ou quebra de linha.');
      return;
    }
    setSaving(true);
    try {
      await broadcastCampaignsService.addRecipients(campaign.id, ids);
      toast.success(`${ids.length} destinatário(s) adicionado(s).`);
      setOpen(false);
      setRaw('');
      onAdded();
    } catch {
      toast.error('Falha ao adicionar destinatários.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="h-4 w-4 mr-1" />
        Adicionar destinatários
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar destinatários</DialogTitle>
            <DialogDescription>
              Cole os IDs dos contatos (UUIDs), separados por vírgula, espaço ou quebra de linha.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            placeholder="contact_id_1, contact_id_2, ..."
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {ids.length} ID(s) detectado(s).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} loading={saving}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
