import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type BroadcastStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface BroadcastCampaign {
  id: string;
  name: string;
  status: BroadcastStatus;
  template_name?: string;
  template_language?: string;
  inbox_id: string;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  rate_limit_per_minute: number;
  progress_percent: number;
  error_message?: string | null;
  created_at: string;
  recipients?: BroadcastRecipient[];
}

export interface BroadcastRecipient {
  id: string;
  contact_id: string;
  contact_name?: string;
  phone_number?: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  sent_at?: string | null;
  error_message?: string | null;
}

export interface CreateCampaignPayload {
  name: string;
  inbox_id: string;
  template_name: string;
  template_language?: string;
  template_params?: Record<string, unknown>;
  rate_limit_per_minute?: number;
  scheduled_at?: string | null;
}

const base = '/broadcast_campaigns';

export const broadcastCampaignsService = {
  list: async (): Promise<BroadcastCampaign[]> => {
    const response = await api.get(base);
    return extractData<BroadcastCampaign[]>(response) || [];
  },

  get: async (id: string): Promise<BroadcastCampaign> => {
    const response = await api.get(`${base}/${id}`);
    return extractData<BroadcastCampaign>(response);
  },

  create: async (payload: CreateCampaignPayload): Promise<BroadcastCampaign> => {
    const response = await api.post(base, payload);
    return extractData<BroadcastCampaign>(response);
  },

  addRecipients: async (id: string, contactIds: string[]): Promise<BroadcastCampaign> => {
    const response = await api.post(`${base}/${id}/add_recipients`, { contact_ids: contactIds });
    return extractData<BroadcastCampaign>(response);
  },

  enqueue: async (id: string): Promise<BroadcastCampaign> => {
    const response = await api.post(`${base}/${id}/enqueue`);
    return extractData<BroadcastCampaign>(response);
  },

  cancel: async (id: string): Promise<BroadcastCampaign> => {
    const response = await api.post(`${base}/${id}/cancel`);
    return extractData<BroadcastCampaign>(response);
  },
};
