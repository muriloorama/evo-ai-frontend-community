import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@evoapi/design-system';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Wallet,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  trackingService,
  type TrackingSummary,
  type TrackingCampaignRow,
  type CampaignInvestment,
  type CampaignInvestmentInput,
} from '@/services/reports/trackingService';
import MetaAdsConfigCard from './MetaAdsConfigCard';
import AdPreviewDialog from './AdPreviewDialog';

const SOURCE_COLORS: Record<string, string> = {
  meta_ad: '#1877F2',
  instagram_ad: '#E4405F',
  whatsapp_direct: '#25D366',
  organic: '#10B981',
  other: '#8B5CF6',
  unknown: '#6B7280',
};

const SOURCE_LABELS: Record<string, string> = {
  meta_ad: 'Meta Ads',
  instagram_ad: 'Instagram Ads',
  whatsapp_direct: 'WhatsApp direto',
  organic: 'Orgânico',
  other: 'Outros',
  unknown: 'Desconhecido',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value || 0);

const formatPercent = (value: number) => `${(value || 0).toFixed(1)}%`;

const todayInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const daysAgoInputValue = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface InvestmentDialogState {
  open: boolean;
  editing: CampaignInvestment | null;
  prefill?: { campaign_key?: string; campaign_name?: string; source_type?: string };
}

const TrackingTab = () => {
  const [summary, setSummary] = useState<TrackingSummary | null>(null);
  const [investments, setInvestments] = useState<CampaignInvestment[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(daysAgoInputValue(30));
  const [endDate, setEndDate] = useState(todayInputValue());
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<InvestmentDialogState>({ open: false, editing: null });
  const [previewCampaign, setPreviewCampaign] = useState<TrackingCampaignRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, inv, metaAccounts] = await Promise.all([
        trackingService.getSummary({
          start_date: startDate,
          end_date: endDate,
          source_type: sourceFilter || undefined,
        }),
        trackingService.listInvestments(startDate, endDate),
        trackingService.listMetaAccounts().catch(() => []),
      ]);
      setSummary(s);
      setInvestments(inv);
      setMetaConnected(metaAccounts.length > 0);
    } catch (e) {
      console.error('Error loading tracking summary:', e);
      toast.error('Erro ao carregar rastreamento');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, sourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const sourceChartData = useMemo(() => {
    if (!summary) return [];
    return summary.by_source.map(s => ({
      name: s.label,
      value: s.leads,
      color: SOURCE_COLORS[s.source_type] || SOURCE_COLORS.other,
    }));
  }, [summary]);

  // Meta's ACTIVE status is a fan-out: "ACTIVE" only means the ad *and* its
  // parent adset/campaign are all running. CAMPAIGN_PAUSED / ADSET_PAUSED /
  // PAUSED / ARCHIVED / DELETED / DISAPPROVED all mean "not currently
  // delivering". We gate everything non-ACTIVE behind a toggle.
  const isAdLive = (status?: string | null) => !status || status === 'ACTIVE';

  const visibleCampaigns = useMemo(() => {
    if (!summary) return [];
    return showArchived
      ? summary.by_campaign
      : summary.by_campaign.filter(c => isAdLive(c.ad_status));
  }, [summary, showArchived]);

  const campaignChartData = useMemo(() => {
    return visibleCampaigns.slice(0, 10).map(c => ({
      name: c.campaign_name.length > 25 ? c.campaign_name.slice(0, 25) + '…' : c.campaign_name,
      leads: c.leads,
      won: c.won,
      fill: SOURCE_COLORS[c.source_type] || SOURCE_COLORS.other,
    }));
  }, [visibleCampaigns]);

  const maxFunnelLeads = useMemo(
    () => (summary?.funnel.length ? Math.max(...summary.funnel.map(s => s.leads), 1) : 1),
    [summary]
  );

  const handleSaveInvestment = async (input: CampaignInvestmentInput) => {
    try {
      if (dialog.editing) {
        await trackingService.updateInvestment(dialog.editing.id, input);
        toast.success('Investimento atualizado');
      } else {
        await trackingService.createInvestment(input);
        toast.success('Investimento adicionado');
      }
      setDialog({ open: false, editing: null });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.errors?.join(', ') || 'Erro ao salvar investimento';
      toast.error(msg);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!window.confirm('Remover este investimento?')) return;
    try {
      await trackingService.deleteInvestment(id);
      toast.success('Investimento removido');
      load();
    } catch (e) {
      toast.error('Erro ao remover');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando rastreamento…
      </div>
    );
  }

  if (!summary) return null;

  const t = summary.totals;

  return (
    <div className="flex flex-col gap-6">
      {/* Configuração Meta Ads */}
      <MetaAdsConfigCard onSyncCompleted={load} />

      {/* Filtros de período/fonte */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Fonte</Label>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Todas</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5" /> Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
          label="Leads no período"
          value={t.leads.toString()}
          sublabel={`${t.paid_leads} pagos · ${t.organic_leads} orgânicos`}
        />
        <MetricCard
          icon={Target}
          gradient="from-emerald-500 to-teal-500"
          label="Conversão"
          value={formatPercent(t.conversion_rate)}
          sublabel={`${t.won} vendas · ${t.lost} perdidos`}
        />
        <MetricCard
          icon={DollarSign}
          gradient="from-amber-500 to-orange-500"
          label="Receita"
          value={formatCurrency(t.revenue)}
          sublabel={`Investimento: ${formatCurrency(t.investment)}`}
        />
        <MetricCard
          icon={TrendingUp}
          gradient="from-purple-500 to-pink-500"
          label="ROI"
          value={t.investment > 0 ? formatPercent(t.roi_percent) : '—'}
          sublabel={`CPL: ${t.investment > 0 ? formatCurrency(t.cpl) : '—'}`}
        />
      </div>

      {/* Funil + Distribuição por fonte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Funil de conversão
            </CardTitle>
            <CardDescription>Leads em cada estágio do pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.funnel.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">Sem dados de funil</div>
            )}
            {summary.funnel.map(stage => {
              const pct = (stage.leads / maxFunnelLeads) * 100;
              return (
                <div key={stage.stage_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: stage.color || undefined }}>
                      {stage.stage_name}
                    </span>
                    <span className="text-muted-foreground">{stage.leads} leads</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: stage.color || '#3b82f6' }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Origem dos leads
            </CardTitle>
            <CardDescription>Distribuição por canal de aquisição</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {sourceChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} leads`, '']}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={value => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de campanhas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Top 10 Campanhas (leads)
          </CardTitle>
          <CardDescription>Campanhas que mais geraram contatos no período</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignChartData.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Sem campanhas no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, campaignChartData.length * 32)}>
              <BarChart data={campaignChartData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" width={150} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  formatter={(v, name) => [v ?? 0, name === 'leads' ? 'Leads' : 'Vendas']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]}>
                  {campaignChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
                <Bar dataKey="won" name="Vendas" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela de campanhas com investimento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Detalhamento por campanha
            </CardTitle>
            <CardDescription>
              {metaConnected
                ? 'Valores de investimento sincronizados automaticamente do Meta Ads'
                : 'Leads, conversão, investimento e ROI'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {summary && summary.by_campaign.some(c => !isAdLive(c.ad_status)) && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Mostrar pausados/arquivados
              </label>
            )}
            {!metaConnected && (
              <Button size="sm" onClick={() => setDialog({ open: true, editing: null })}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Investimento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Campanha</th>
                  <th className="text-left p-3">Fonte</th>
                  <th className="text-right p-3">Alcance</th>
                  <th className="text-right p-3">CTR</th>
                  <th className="text-right p-3">Leads</th>
                  <th className="text-right p-3">Vendas</th>
                  <th className="text-right p-3">Conv.</th>
                  <th className="text-right p-3">Receita</th>
                  <th className="text-right p-3">Invest.</th>
                  <th className="text-right p-3">ROI</th>
                  <th className="text-right p-3">CPL</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-muted-foreground">
                      {summary.by_campaign.length === 0
                        ? 'Sem campanhas no período'
                        : 'Nenhum anúncio ativo — ative "Mostrar pausados/arquivados" pra ver os pausados'}
                    </td>
                  </tr>
                )}
                {visibleCampaigns.map(c => {
                  const hasAdDetails =
                    !!c.ad_creative_url || !!c.ad_headline || !!c.landing_url || !!c.referrer_url;
                  return (
                  <tr key={c.campaign_key} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={!hasAdDetails}
                        onClick={() => setPreviewCampaign(c)}
                        className={`flex items-center gap-2 text-left ${
                          hasAdDetails ? 'hover:text-primary cursor-pointer' : 'cursor-default'
                        }`}
                        title={hasAdDetails ? 'Ver anúncio' : undefined}
                      >
                        {c.ad_creative_url || c.ad_creative_thumbnail ? (
                          <img
                            src={c.ad_creative_url || c.ad_creative_thumbnail || ''}
                            alt=""
                            className="h-8 w-8 rounded object-cover border"
                            onError={e => {
                              const img = e.target as HTMLImageElement;
                              if (c.ad_creative_thumbnail && img.src !== c.ad_creative_thumbnail) {
                                img.src = c.ad_creative_thumbnail;
                              } else {
                                img.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Megaphone className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{c.campaign_name}</span>
                        {c.ad_status && !isAdLive(c.ad_status) && (
                          <span
                            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            title={`Status no Meta: ${c.ad_status}`}
                          >
                            {c.ad_status === 'PAUSED' ? 'pausado' :
                             c.ad_status === 'CAMPAIGN_PAUSED' ? 'campanha pausada' :
                             c.ad_status === 'ADSET_PAUSED' ? 'conjunto pausado' :
                             c.ad_status === 'ARCHIVED' ? 'arquivado' :
                             c.ad_status === 'DELETED' ? 'excluído' :
                             c.ad_status.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: `${SOURCE_COLORS[c.source_type] || '#999'}20`, color: SOURCE_COLORS[c.source_type] || '#999' }}
                      >
                        {SOURCE_LABELS[c.source_type] || c.source_type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{c.reach > 0 ? c.reach.toLocaleString('pt-BR') : '—'}</td>
                    <td className="p-3 text-right">{c.impressions > 0 ? formatPercent(c.ctr) : '—'}</td>
                    <td className="p-3 text-right">{c.leads}</td>
                    <td className="p-3 text-right">{c.won}</td>
                    <td className="p-3 text-right">{formatPercent(c.conversion_rate)}</td>
                    <td className="p-3 text-right">{formatCurrency(c.revenue)}</td>
                    <td className="p-3 text-right">
                      {c.investment > 0 ? (
                        formatCurrency(c.investment)
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {c.investment > 0 ? (
                        <span className={c.roi_percent >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                          {formatPercent(c.roi_percent)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">{c.investment > 0 ? formatCurrency(c.cpl) : '—'}</td>
                    <td className="p-3 text-right">
                      {metaConnected ? (
                        <span className="text-xs text-muted-foreground italic">auto</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() =>
                            setDialog({
                              open: true,
                              editing: null,
                              prefill: {
                                campaign_key: c.campaign_key,
                                campaign_name: c.campaign_name,
                                source_type: c.source_type,
                              },
                            })
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AdPreviewDialog
        campaign={previewCampaign}
        open={!!previewCampaign}
        onOpenChange={open => {
          if (!open) setPreviewCampaign(null);
        }}
      />

      {/* Lista de investimentos cadastrados */}
      {investments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Investimentos cadastrados
            </CardTitle>
            <CardDescription>Investimentos no intervalo selecionado</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Campanha</th>
                    <th className="text-left p-3">Fonte</th>
                    <th className="text-left p-3">Período</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="text-right p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map(inv => (
                    <tr key={inv.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{inv.campaign_name || inv.campaign_key}</td>
                      <td className="p-3">
                        <Badge variant="outline">{SOURCE_LABELS[inv.source_type || ''] || inv.source_type || '—'}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(inv.period_start).toLocaleDateString('pt-BR')} →{' '}
                        {new Date(inv.period_end).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 text-right font-medium">{formatCurrency(inv.amount)}</td>
                      <td className="p-3 text-right">
                        {metaConnected ? (
                          <span className="text-xs text-muted-foreground italic">Meta Ads</span>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setDialog({ open: true, editing: inv })}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteInvestment(inv.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <InvestmentDialog
        state={dialog}
        defaultStart={startDate}
        defaultEnd={endDate}
        onClose={() => setDialog({ open: false, editing: null })}
        onSave={handleSaveInvestment}
      />
    </div>
  );
};

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  label: string;
  value: string;
  sublabel?: string;
}

const MetricCard = ({ icon: Icon, gradient, label, value, sublabel }: MetricCardProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
          {sublabel && <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface InvestmentDialogProps {
  state: InvestmentDialogState;
  defaultStart: string;
  defaultEnd: string;
  onClose: () => void;
  onSave: (input: CampaignInvestmentInput) => Promise<void> | void;
}

const InvestmentDialog = ({ state, defaultStart, defaultEnd, onClose, onSave }: InvestmentDialogProps) => {
  const [form, setForm] = useState<CampaignInvestmentInput>({
    campaign_key: '',
    campaign_name: '',
    source_type: 'meta_ad',
    amount: 0,
    period_start: defaultStart,
    period_end: defaultEnd,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    if (state.editing) {
      setForm({
        campaign_key: state.editing.campaign_key,
        campaign_name: state.editing.campaign_name || '',
        source_type: state.editing.source_type || 'meta_ad',
        amount: state.editing.amount,
        period_start: state.editing.period_start,
        period_end: state.editing.period_end,
        notes: state.editing.notes || '',
      });
    } else {
      setForm({
        campaign_key: state.prefill?.campaign_key || '',
        campaign_name: state.prefill?.campaign_name || '',
        source_type: state.prefill?.source_type || 'meta_ad',
        amount: 0,
        period_start: defaultStart,
        period_end: defaultEnd,
      });
    }
  }, [state, defaultStart, defaultEnd]);

  const handleSubmit = async () => {
    if (!form.campaign_key.trim() || !form.amount) {
      toast.error('Preencha campanha e valor');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{state.editing ? 'Editar investimento' : 'Novo investimento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Identificador da campanha *</Label>
            <Input
              placeholder="Ex.: 1234567890 ou meta_ad"
              value={form.campaign_key}
              onChange={e => setForm(f => ({ ...f, campaign_key: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">
              Use o ID da campanha (Meta) ou um rótulo genérico (ex: "meta_ad")
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome amigável</Label>
            <Input
              placeholder="Ex.: Black Friday Colchões"
              value={form.campaign_name}
              onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fonte</Label>
            <select
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={form.source_type}
              onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
            >
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor (R$) *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {state.editing ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrackingTab;
