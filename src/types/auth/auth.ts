import { Role } from "./rbac";


export interface LoginRequest {
  email: string;
  password: string;
  recaptcha_token?: string;
}

export interface UserType {
  key: string;
  name: string;
}

import type { StandardResponse, ResponseMeta } from '@/types/core';

export interface AccountMembership {
  id: string;
  // Sequential, human-friendly account identifier surfaced in URLs
  // (Chatwoot-style /app/accounts/:number/...). Optional for back-compat with
  // the legacy single-account payload.
  number?: number;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived' | string;
  role: { id: string; key: string; name: string };
  // Legacy fields still returned by the single-account shim; safe to ignore
  // once all accounts come from the real `accounts` table.
  domain?: string | null;
  support_email?: string | null;
  locale?: string | null;
  features?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  custom_attributes?: Record<string, unknown>;
}

export interface LoginData {
  user: {
    id: string;
    name: string;
    email: string;
    display_name?: string | null;
    availability?: 'online' | 'offline' | 'busy';
    mfa_enabled?: boolean;
    confirmed?: boolean;
    role?: Role;
  };
  // Multi-account claims populated by the Auth service (Fase 1.4).
  accounts?: AccountMembership[];
  active_account_id?: string | null;
  active_account_number?: number | null;
  super_admin?: boolean;
  token: {
    access_token?: string;
    token?: {
      access_token?: string;
      type?: string;
    };
    expires_in?: number;
    token_type?: string;
    scopes?: string[];
    created_at?: string;
  };
}

export interface LoginResponse extends StandardResponse<LoginData> {
  meta: ResponseMeta;
  message?: string;
}

// Profile related interfaces
export interface ProfileUpdateData {
  name?: string;
  display_name?: string;
  email?: string;
  ui_settings?: UISettings;
  message_signature?: string;
  availability?: 'online' | 'offline' | 'busy';
  auto_offline?: boolean;
  avatar?: File | null;
}

// Password change data interface
export interface PasswordChangeData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirmation: string;
  name: string;
  recaptcha_token?: string;
  confirm_success_url?: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  name: string;
}

export interface ForgotPasswordRequest {
  email: string;
  recaptcha_token?: string;
}

export interface ResetPasswordRequest {
  reset_password_token: string;
  password: string;
  password_confirmation: string;
}

export interface UISettings {
  is_ct_labels_open?: boolean;
  sidebar_collapsed?: boolean;
  rtl_view?: boolean;
  conversation_display_type?: string;
  editor_message_key?: 'enter' | 'cmd_enter';
  font_size?: 'small' | 'medium' | 'large';
  [key: string]: unknown;
}

export interface UserResponse {
  id: string;
  uid?: string;
  email: string;
  name: string;
  display_name?: string | null;
  access_token?: string; // Legacy field for backward compatibility
  api_access_token?: string; // New field from evo-auth-service
  available_name?: string;
  avatar_url?: string;
  confirmed?: boolean;
  message_signature?: string | null;
  provider?: string;
  pubsub_token?: string | null;
  role?: Role; // Updated to use Role interface
  ui_settings?: UISettings;
  type?: string | null;
  inviter_id?: string | null;
  availability?: 'online' | 'offline' | 'busy';
  auto_offline?: boolean;
  mfa_enabled?: boolean;
  unconfirmed_email?: string | null;
  created_at?: string;
  custom_attributes?: Record<string, unknown>;
  setup_survey_completed?: boolean;
  [key: string]: unknown;
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      detail?: string;
    };
  };
  message?: string;
}

export interface UserTour {
  id: string;
  tour_key: string;
  completed_at: string;
  status: 'completed' | 'skipped';
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export interface PasswordUpdateResponse extends StandardResponse<{ message: string }> {}
