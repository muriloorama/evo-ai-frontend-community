import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

// API axios baseURL ends in `/api/v1`; build absolute URLs for v2 endpoints.
const v2 = (path: string) => {
  const base = (import.meta.env.VITE_API_URL as string) || '';
  return `${base}/api/v2${path.startsWith('/') ? path : `/${path}`}`;
};

export interface TrackingTotals {
  leads: number;
  paid_leads: number;
  organic_leads: number;
  won: number;
  lost: number;
  conversion_rate: number;
  revenue: number;
  investment: number;
  roi_percent: number;
  cpl: number;
}

export interface TrackingSourceRow {
  source_type: string;
  label: string;
  leads: number;
  won: number;
  conversion_rate: number;
  revenue: number;
  investment: number;
  roi_percent: number;
  cpl: number;
}

export interface TrackingCampaignRow {
  campaign_key: string;
  campaign_name: string;
  source_type: string;
  leads: number;
  won: number;
  conversion_rate: number;
  revenue: number;
  investment: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  roi_percent: number;
  cpl: number;
  cac: number;
  ad_creative_url?: string | null;
  ad_creative_thumbnail?: string | null;
  ad_headline?: string | null;
  ad_body?: string | null;
  ad_media_type?: string | null;
  ad_status?: string | null;
  landing_url?: string | null;
  referrer_url?: string | null;
}

export interface TrackingFunnelStage {
  stage_id: string;
  stage_name: string;
  color: string;
  position: number;
  leads: number;
}

export interface TrackingSummary {
  period: { start: string; end: string };
  totals: TrackingTotals;
  by_source: TrackingSourceRow[];
  by_campaign: TrackingCampaignRow[];
  funnel: TrackingFunnelStage[];
}

export interface CampaignInvestment {
  id: string;
  campaign_key: string;
  campaign_name?: string | null;
  source_type?: string | null;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignInvestmentInput {
  campaign_key: string;
  campaign_name?: string;
  source_type?: string;
  amount: number;
  currency?: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

export interface TrackingFilters {
  start_date?: string;
  end_date?: string;
  pipeline_id?: string;
  source_type?: string;
}

export interface MetaAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name?: string | null;
  business_name?: string | null;
  currency: string;
  active: boolean;
  token_expires_at?: string | null;
  token_expired: boolean;
  token_expiring_soon: boolean;
  last_sync_at?: string | null;
  last_sync_status?: 'ok' | 'error' | null;
  last_sync_error?: string | null;
  last_sync_campaigns_count: number;
  token_days_until_expiry?: number | null;
  created_at: string;
}

export interface MetaTokenValidation {
  ok: boolean;
  user?: { id: string; name: string };
  ad_accounts?: Array<{
    id: string;
    name: string;
    currency: string;
    business_name?: string | null;
    status?: number;
  }>;
  error?: string;
  status?: number;
}

class TrackingService {
  async getSummary(filters: TrackingFilters = {}): Promise<TrackingSummary> {
    const response = await api.get(v2('/reports/tracking_summary'), { params: filters });
    return extractData<TrackingSummary>(response);
  }

  async listInvestments(start_date?: string, end_date?: string): Promise<CampaignInvestment[]> {
    const response = await api.get(v2('/campaign_investments'), {
      params: { start_date, end_date }
    });
    return extractData<CampaignInvestment[]>(response);
  }

  async createInvestment(input: CampaignInvestmentInput): Promise<CampaignInvestment> {
    const response = await api.post(v2('/campaign_investments'), { campaign_investment: input });
    return extractData<CampaignInvestment>(response);
  }

  async updateInvestment(id: string, input: Partial<CampaignInvestmentInput>): Promise<CampaignInvestment> {
    const response = await api.patch(v2(`/campaign_investments/${id}`), { campaign_investment: input });
    return extractData<CampaignInvestment>(response);
  }

  async deleteInvestment(id: string): Promise<void> {
    await api.delete(v2(`/campaign_investments/${id}`));
  }

  async listMetaAccounts(): Promise<MetaAdAccount[]> {
    const response = await api.get(v2('/meta_ad_accounts'));
    return extractData<MetaAdAccount[]>(response);
  }

  async validateMetaToken(access_token: string): Promise<MetaTokenValidation> {
    const response = await api.post(v2('/meta_ad_accounts/validate_token'), { access_token });
    return extractData<MetaTokenValidation>(response);
  }

  async createMetaAccount(input: {
    access_token: string;
    ad_account_id: string;
    ad_account_name?: string;
    business_name?: string;
    currency?: string;
    token_expires_at?: string;
  }): Promise<MetaAdAccount> {
    const response = await api.post(v2('/meta_ad_accounts'), { meta_ad_account: input });
    return extractData<MetaAdAccount>(response);
  }

  async syncMetaNow(id: string): Promise<{ ok: boolean; message: string }> {
    const response = await api.post(v2(`/meta_ad_accounts/${id}/sync_now`));
    return extractData(response);
  }

  async deleteMetaAccount(id: string): Promise<void> {
    await api.delete(v2(`/meta_ad_accounts/${id}`));
  }
}

export const trackingService = new TrackingService();
