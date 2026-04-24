import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type MessageSource = 'inbox_agent' | 'custom_agent' | 'template';
export type MaxAttemptsAction = 'noop' | 'move_to_stage';

export interface FollowUpRule {
  id: string;
  name: string;
  pipeline_stage_id: string;
  pipeline_stage_name: string | null;
  intervals: number[];
  message_source: MessageSource;
  custom_agent_bot_id: string | null;
  custom_agent_bot_name: string | null;
  template_text: string | null;
  extra_instructions: string | null;
  on_max_attempts_action: MaxAttemptsAction;
  on_max_target_stage_id: string | null;
  on_max_target_stage_name: string | null;
  enabled: boolean;
  executions_pending: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUpExecution {
  id: string;
  rule_id: string;
  rule_name: string | null;
  conversation_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  status: 'pending' | 'done' | 'cancelled';
  cancel_reason: string | null;
  attempts_count: number;
  max_attempts: number | null;
  next_attempt_at: string;
  attempts_at: string[];
  created_at: string;
}

export interface UpsertRulePayload {
  name: string;
  pipeline_stage_id: string;
  intervals: number[];
  message_source: MessageSource;
  custom_agent_bot_id?: string | null;
  template_text?: string | null;
  extra_instructions?: string | null;
  on_max_attempts_action: MaxAttemptsAction;
  on_max_target_stage_id?: string | null;
  enabled: boolean;
}

export const listRules = async (): Promise<FollowUpRule[]> => {
  const response = await api.get('/follow_up_rules');
  const data = extractData<{ follow_up_rules: FollowUpRule[] }>(response);
  return data.follow_up_rules || [];
};

export const createRule = async (payload: UpsertRulePayload): Promise<FollowUpRule> => {
  const response = await api.post('/follow_up_rules', { follow_up_rule: payload });
  const data = extractData<{ follow_up_rule: FollowUpRule }>(response);
  return data.follow_up_rule;
};

export const updateRule = async (id: string, payload: Partial<UpsertRulePayload>): Promise<FollowUpRule> => {
  const response = await api.patch(`/follow_up_rules/${id}`, { follow_up_rule: payload });
  const data = extractData<{ follow_up_rule: FollowUpRule }>(response);
  return data.follow_up_rule;
};

export const deleteRule = async (id: string): Promise<void> => {
  await api.delete(`/follow_up_rules/${id}`);
};

export const listExecutions = async (status?: 'pending' | 'done' | 'cancelled'): Promise<FollowUpExecution[]> => {
  const response = await api.get('/follow_up_executions', { params: status ? { status } : undefined });
  const data = extractData<{ follow_up_executions: FollowUpExecution[] }>(response);
  return data.follow_up_executions || [];
};
