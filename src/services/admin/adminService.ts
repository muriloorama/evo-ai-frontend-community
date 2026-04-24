import apiAuth from '@/services/core/apiAuth';
import { extractData } from '@/utils/apiHelpers';

// Shapes returned by the Auth service /api/v1/admin/* endpoints (see
// app/controllers/api/v1/admin/accounts_controller.rb and memberships_controller.rb).
export interface AdminAccount {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  support_email: string | null;
  locale: string;
  status: string;
  features: Record<string, unknown>;
  settings: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminMembership {
  id: string;
  account_id: string;
  user: { id: string; name: string; email: string };
  role: { id: string; key: string; name: string };
  granted_by_id: string | null;
  granted_at: string;
}

export interface CreateAccountPayload {
  name: string;
  slug?: string;
  domain?: string;
  support_email?: string;
  locale?: string;
  status?: string;
  settings?: Record<string, unknown>;
  custom_attributes?: Record<string, unknown>;
}

export interface InviteMemberPayload {
  email: string;
  role_key: string;
  name?: string;
}

export const listAccounts = async (): Promise<AdminAccount[]> => {
  const response = await apiAuth.get('/admin/accounts');
  const data = extractData<{ accounts: AdminAccount[] }>(response);
  return data.accounts || [];
};

export const getAccount = async (id: string): Promise<AdminAccount> => {
  const response = await apiAuth.get(`/admin/accounts/${id}`);
  const data = extractData<{ account: AdminAccount }>(response);
  return data.account;
};

export const createAccount = async (payload: CreateAccountPayload): Promise<AdminAccount> => {
  const response = await apiAuth.post('/admin/accounts', { account: payload });
  const data = extractData<{ account: AdminAccount }>(response);
  return data.account;
};

export const updateAccount = async (id: string, payload: Partial<CreateAccountPayload>): Promise<AdminAccount> => {
  const response = await apiAuth.patch(`/admin/accounts/${id}`, { account: payload });
  const data = extractData<{ account: AdminAccount }>(response);
  return data.account;
};

export const deleteAccount = async (id: string): Promise<void> => {
  await apiAuth.delete(`/admin/accounts/${id}`);
};

export const listMemberships = async (accountId: string): Promise<AdminMembership[]> => {
  const response = await apiAuth.get(`/admin/accounts/${accountId}/memberships`);
  const data = extractData<{ memberships: AdminMembership[] }>(response);
  return data.memberships || [];
};

export const inviteMember = async (
  accountId: string,
  payload: InviteMemberPayload
): Promise<{ membership: AdminMembership; invited: boolean }> => {
  const response = await apiAuth.post(`/admin/accounts/${accountId}/memberships`, payload);
  return extractData<{ membership: AdminMembership; invited: boolean }>(response);
};

export const revokeMember = async (accountId: string, userId: string): Promise<void> => {
  await apiAuth.delete(`/admin/accounts/${accountId}/memberships/${userId}`);
};

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  super_admin: boolean;
  account_count: number;
  confirmed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface CreateUserPayload {
  email: string;
  name?: string;
  super_admin?: boolean;
  send_invite?: boolean;
}

export const listUsers = async (search?: string): Promise<AdminUser[]> => {
  const response = await apiAuth.get('/admin/users', {
    params: search ? { search } : undefined
  });
  const data = extractData<{ users: AdminUser[] }>(response);
  return data.users || [];
};

export const createUser = async (
  payload: CreateUserPayload
): Promise<{ user: AdminUser; temporary_password?: string }> => {
  const response = await apiAuth.post('/admin/users', payload);
  return extractData<{ user: AdminUser; temporary_password?: string }>(response);
};

export const grantSuperAdmin = async (userId: string): Promise<AdminUser> => {
  const response = await apiAuth.post(`/admin/users/${userId}/grant_super_admin`);
  const data = extractData<{ user: AdminUser }>(response);
  return data.user;
};

export const revokeSuperAdmin = async (userId: string): Promise<AdminUser> => {
  const response = await apiAuth.delete(`/admin/users/${userId}/revoke_super_admin`);
  const data = extractData<{ user: AdminUser }>(response);
  return data.user;
};

export const deleteUser = async (userId: string): Promise<void> => {
  await apiAuth.delete(`/admin/users/${userId}`);
};
