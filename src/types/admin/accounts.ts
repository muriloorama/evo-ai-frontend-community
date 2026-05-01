// Account feature/limit types — mirror of evo-auth-service's
// `AccountFeatureGate.snapshot` shape and the YAML at
// `config/account_defaults.yml`.
//
// All booleans default to `true` and all numeric limits default to `null`
// ("sem limite") on the backend; the UI must treat `undefined` from the
// snapshot exactly the same as the default to never silently lock a
// workspace that hasn't been touched.

export type LimitValue = number | null;

export interface AccountLimits {
  max_inboxes: LimitValue;
  max_agents: LimitValue;
  max_contacts: LimitValue;
  max_conversations_month: LimitValue;
  max_storage_mb: LimitValue;
}

export interface AccountAi {
  enabled: boolean;
  max_bots: LimitValue;
}

export interface AccountChannels {
  whatsapp_cloud: boolean;
  whatsapp_uazapi: boolean;
  whatsapp_evolution: boolean;
  instagram: boolean;
  facebook: boolean;
  email: boolean;
  webhook: boolean;
  api: boolean;
}

export interface AccountFeatureFlags {
  pipelines: boolean;
  macros: boolean;
  broadcast: boolean;
  followup: boolean;
  scheduled_messages: boolean;
  csat: boolean;
  automations: boolean;
  working_hours: boolean;
  mass_actions: boolean;
  reports: boolean;
}

// Shape returned by GET /admin/accounts/:id under `feature_snapshot`.
export interface AccountFeatureSnapshot {
  limits: AccountLimits;
  ai: AccountAi;
  channels: AccountChannels;
  features: AccountFeatureFlags;
}

// Convenience union of every key path the UI may need to gate on.
export type FeatureKey =
  | `features.${keyof AccountFeatureFlags}`
  | `channels.${keyof AccountChannels}`
  | 'ai.enabled';

export type LimitKey =
  | `limits.${keyof AccountLimits}`
  | 'ai.max_bots';

// What the form holds while the operator is editing. `features` mirrors
// the JSONB column shape in evo-auth-service: { features:, ai:, channels: }.
// `settings` mirrors the other JSONB column: { limits: }.
export interface AccountFeaturesPayload {
  features?: Partial<AccountFeatureFlags>;
  ai?: Partial<AccountAi>;
  channels?: Partial<AccountChannels>;
}

export interface AccountSettingsPayload {
  limits?: Partial<AccountLimits>;
  [key: string]: unknown;
}

// Defaults to seed the form when the backend doesn't ship a snapshot
// (e.g. older auth service version). Keeps the UI behavior aligned with
// the documented "defaults = TUDO LIBERADO" rule.
export const DEFAULT_SNAPSHOT: AccountFeatureSnapshot = {
  limits: {
    max_inboxes: null,
    max_agents: null,
    max_contacts: null,
    max_conversations_month: null,
    max_storage_mb: null
  },
  ai: {
    enabled: true,
    max_bots: null
  },
  channels: {
    whatsapp_cloud: true,
    whatsapp_uazapi: true,
    whatsapp_evolution: true,
    instagram: true,
    facebook: true,
    email: true,
    webhook: true,
    api: true
  },
  features: {
    pipelines: true,
    macros: true,
    broadcast: true,
    followup: true,
    scheduled_messages: true,
    csat: true,
    automations: true,
    working_hours: true,
    mass_actions: true,
    reports: true
  }
};
