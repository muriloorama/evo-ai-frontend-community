import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from '@evoapi/design-system';
import { ExternalLink, Instagram, Facebook, Megaphone, ImageOff } from 'lucide-react';
import type { TrackingCampaignRow } from '@/services/reports/trackingService';

interface AdPreviewDialogProps {
  campaign: TrackingCampaignRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatNumber = (n: number) => n.toLocaleString('pt-BR');
const formatCurrency = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const AdPreviewDialog = ({ campaign, open, onOpenChange }: AdPreviewDialogProps) => {
  if (!campaign) return null;

  const isInstagram = campaign.source_type === 'instagram_ad';
  const isMeta = campaign.source_type === 'meta_ad';
  const PlatformIcon = isInstagram ? Instagram : isMeta ? Facebook : Megaphone;
  const platformLabel = isInstagram ? 'Instagram Ads' : isMeta ? 'Meta Ads' : 'Anúncio';

  const isVideo = (campaign.ad_media_type || '').toLowerCase().includes('video');
  const creativeUrl = campaign.ad_creative_url || '';
  // Meta/Instagram creative URLs expire — the base64 thumbnail captured from
  // the CTWA webhook is our durable fallback. Tracked in state so we can swap
  // to it on <img onError>.
  const creativeThumbnail = campaign.ad_creative_thumbnail || '';
  const [imageFailed, setImageFailed] = useState(false);
  const effectiveImageSrc = imageFailed && creativeThumbnail ? creativeThumbnail : creativeUrl;
  const hasCreative = !!effectiveImageSrc;
  const looksLikeImage = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(effectiveImageSrc) ||
    effectiveImageSrc.startsWith('data:image') ||
    effectiveImageSrc.includes('unsplash') || effectiveImageSrc.includes('images.');
  const canRenderInline = hasCreative && !effectiveImageSrc.endsWith('.pdf') && (looksLikeImage || isVideo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                isInstagram
                  ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/30 dark:text-pink-300'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300'
              }`}
            >
              <PlatformIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base leading-tight">
                {campaign.ad_headline || campaign.campaign_name}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">{platformLabel}</Badge>
                <span className="text-xs text-muted-foreground truncate">{campaign.campaign_name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Creative preview */}
        <div className="w-full bg-muted/40 rounded-md overflow-hidden aspect-video flex items-center justify-center">
          {canRenderInline && isVideo ? (
            <video src={effectiveImageSrc} controls className="max-h-full max-w-full" />
          ) : canRenderInline ? (
            <img
              src={effectiveImageSrc}
              alt={campaign.ad_headline || campaign.campaign_name}
              className="max-h-full max-w-full object-contain"
              onError={e => {
                if (!imageFailed && creativeThumbnail) {
                  setImageFailed(true);
                } else {
                  (e.target as HTMLImageElement).style.display = 'none';
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-xs gap-2 py-8">
              <ImageOff className="h-8 w-8" />
              <span>Preview indisponível</span>
              {hasCreative && (
                <a
                  href={creativeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Abrir arquivo original
                </a>
              )}
            </div>
          )}
        </div>

        {/* Ad body */}
        {campaign.ad_body && (
          <div className="text-sm text-muted-foreground border-l-2 border-border pl-3 py-1">
            {campaign.ad_body}
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <MetricCell label="Alcance" value={campaign.reach > 0 ? formatNumber(campaign.reach) : '—'} />
          <MetricCell label="Impressões" value={campaign.impressions > 0 ? formatNumber(campaign.impressions) : '—'} />
          <MetricCell
            label="CTR"
            value={campaign.impressions > 0 ? `${campaign.ctr.toFixed(2).replace('.', ',')}%` : '—'}
          />
          <MetricCell label="Leads" value={formatNumber(campaign.leads)} />
          <MetricCell label="Vendas" value={formatNumber(campaign.won)} />
          <MetricCell label="Investimento" value={campaign.investment > 0 ? formatCurrency(campaign.investment) : '—'} />
          <MetricCell label="CPL" value={campaign.cpl > 0 ? formatCurrency(campaign.cpl) : '—'} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {campaign.referrer_url && (
            <Button asChild variant="outline" size="sm">
              <a href={campaign.referrer_url} target="_blank" rel="noopener noreferrer">
                <PlatformIcon className="h-4 w-4 mr-1.5" />
                Abrir no {platformLabel}
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </a>
            </Button>
          )}
          {campaign.landing_url && (
            <Button asChild variant="outline" size="sm">
              <a href={campaign.landing_url} target="_blank" rel="noopener noreferrer">
                Landing page
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </a>
            </Button>
          )}
          {campaign.ad_creative_url && (
            <Button asChild variant="ghost" size="sm">
              <a href={campaign.ad_creative_url} target="_blank" rel="noopener noreferrer">
                Criativo original
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MetricCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/30 rounded p-2">
    <div className="text-[10px] uppercase text-muted-foreground font-medium">{label}</div>
    <div className="text-sm font-semibold mt-0.5">{value}</div>
  </div>
);

export default AdPreviewDialog;
