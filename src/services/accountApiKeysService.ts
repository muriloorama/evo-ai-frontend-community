import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export interface AccountApiKey {
  id: string;
  name: string;
  last4: string;
  created_by?: { id: string; name?: string | null };
  last_used_at?: string | null;
  revoked_at?: string | null;
  active: boolean;
  created_at: string;
  /** Only returned on create(). Never shown again. */
  token?: string;
}

const base = '/account_api_keys';

export const accountApiKeysService = {
  list: async (): Promise<AccountApiKey[]> => {
    const response = await api.get(base);
    return extractData<AccountApiKey[]>(response) || [];
  },

  create: async (name: string): Promise<AccountApiKey> => {
    const response = await api.post(base, { name });
    return extractData<AccountApiKey>(response);
  },

  revoke: async (id: string): Promise<void> => {
    await api.delete(`${base}/${id}`);
  },
};
