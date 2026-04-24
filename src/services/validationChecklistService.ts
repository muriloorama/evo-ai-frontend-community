import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export interface ChecklistRow {
  item_key: string;
  checked: boolean;
  checked_by?: { id: string; name?: string | null };
  checked_at?: string;
}

const base = '/validation_checklist';

export const validationChecklistService = {
  list: async (): Promise<ChecklistRow[]> => {
    const response = await api.get(base);
    return extractData<ChecklistRow[]>(response) || [];
  },

  toggle: async (itemKey: string, checked: boolean): Promise<ChecklistRow> => {
    const response = await api.post(`${base}/toggle`, { item_key: itemKey, checked });
    return extractData<ChecklistRow>(response);
  },

  reset: async (): Promise<void> => {
    await api.post(`${base}/reset`);
  },
};
