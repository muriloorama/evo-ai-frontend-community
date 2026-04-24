import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import CustomerRoute from './CustomerRoute';
import SmartRedirect from './SmartRedirect';
import AccountGuard from './AccountGuard';
import RouterGuard from '@/guards/RouterGuard';
import PermissionRoute from './PermissionRoute';
import SuperAdminRoute from './SuperAdminRoute';
import SuperAdminAccounts from '@/pages/SuperAdmin/Accounts';
import SuperAdminAccountMembers from '@/pages/SuperAdmin/AccountMembers';
import SuperAdminUsers from '@/pages/SuperAdmin/Users';
import FollowUps from '@/pages/FollowUps/FollowUps';
import { useAuthStore } from '@/store/authStore';

import MainLayout from '@/components/layout/MainLayout';

// Páginas públicas
import Auth from '@/pages/Auth';
import EmailConfirmation from '@/components/auth/EmailConfirmation';
import ResetPassword from '@/components/auth/ResetPassword';
import InstagramCallback from '@/pages/InstagramCallback';
import GoogleCallback from '@/pages/GoogleCallback';
import GoogleCalendarCallback from '@/pages/GoogleCalendarCallback';
import GoogleSheetsCallback from '@/pages/GoogleSheetsCallback';
import GitHubCallback from '@/pages/GitHubCallback';
import NotionCallback from '@/pages/NotionCallback';
import StripeCallback from '@/pages/StripeCallback';
import LinearCallback from '@/pages/LinearCallback';
import MondayCallback from '@/pages/MondayCallback';
import AtlassianCallback from '@/pages/AtlassianCallback';
import MicrosoftCallback from '@/pages/MicrosoftCallback';
import SurveyResponse from '@/pages/Public/Survey/SurveyResponse';

// Páginas customer
import Dashboard from '@/pages/Customer/Dashboard';
import Agents from '@/pages/Customer/Agents';
import AgentEditPage from '@/pages/Customer/Agents/Agent/AgentEditPage';
import MCPServers from '@/pages/Customer/Agents/MCPServers';
import CustomMCPServers from '@/pages/Customer/Agents/CustomMCPServers';
import Tools from '@/pages/Customer/Agents/Tools';
import CustomTools from '@/pages/Customer/Agents/CustomTools';
import Contacts from '@/pages/Customer/Contacts';
import ScheduledActions from '@/pages/Customer/Contacts/ScheduledActions';
import { Channels, ChannelSettings, NewChannel } from '@/pages/Customer/Channels';
const ChatPage = React.lazy(() => import('@/pages/Customer/Chat/ChatPage'));

// import Automation from '../pages/Customer/Automation';
// import AutomationFlowEditor from '../pages/Customer/Automation/AutomationFlowEditor';
import Pipelines from '@/pages/Customer/Pipelines/Pipelines';
import PipelineKanban from '@/pages/Customer/Pipelines/PipelineKanban';
import { AccountSettings } from '@/pages/Customer/Settings/Account';
import Teams from '@/pages/Customer/Settings/Teams/Teams';
import { AddUsers } from '@/pages/Customer/Settings/Teams';
import Users from '@/pages/Customer/Settings/Users';
import Labels from '@/pages/Customer/Settings/Labels';
import CustomAttributes from '@/pages/Customer/Settings/CustomAttributes';
import CannedResponses from '@/pages/Customer/Settings/CannedResponses';
import { Macros } from '@/pages/Customer/Settings/Macros';
import { Integrations } from '@/pages/Customer/Settings/Integrations';
import EmailTemplateEditor from '@/pages/Customer/Settings/EmailTemplateEditor';
import WebhooksPage from '../pages/Customer/Settings/Integrations/WebhooksPage';
import OAuthAppsPage from '../pages/Customer/Settings/Integrations/OAuthAppsPage';
import DashboardAppsPage from '../pages/Customer/Settings/Integrations/DashboardAppsPage';
import AccessTokens from '../pages/Customer/Settings/AccessTokens/AccessTokens';
import SlackIntegrationPage from '../pages/Customer/Settings/Integrations/SlackIntegrationPage';
import OpenAIPage from '../pages/Customer/Settings/Integrations/OpenAIPage';
import BMSPage from '../pages/Customer/Settings/Integrations/BMSPage';
import LeadSquaredPage from '../pages/Customer/Settings/Integrations/LeadSquaredPage';
import HubSpotPage from '../pages/Customer/Settings/Integrations/HubSpotPage';
import ShopifyPage from '../pages/Customer/Settings/Integrations/ShopifyPage';
import LinearPage from '../pages/Customer/Settings/Integrations/LinearPage';
import DashboardAppPage from '../pages/Customer/DashboardApp';
// import { Overview, Conversations } from '../pages/Customer/Reports';
// import * as Reports from '../pages/Customer/Reports';

// Páginas admin
import AdminSettingsLayout from '@/pages/Admin/Settings';
const SmtpConfig = React.lazy(() => import('@/pages/Admin/Settings/SmtpConfig'));
const StorageConfig = React.lazy(() => import('@/pages/Admin/Settings/StorageConfig'));
const SocialLoginConfig = React.lazy(() => import('@/pages/Admin/Settings/SocialLoginConfig'));
const ChannelConfig = React.lazy(() => import('@/pages/Admin/Settings/ChannelConfig'));
const OpenAIConfig = React.lazy(() => import('@/pages/Admin/Settings/OpenAIConfig'));
const IntegrationsConfig = React.lazy(() => import('@/pages/Admin/Settings/IntegrationsConfig'));
const InboundEmailConfig = React.lazy(() => import('@/pages/Admin/Settings/InboundEmailConfig'));
const FrontendRuntimeConfig = React.lazy(() => import('@/pages/Admin/Settings/FrontendRuntimeConfig'));

// Página de tutoriais
import Tutorials from '@/pages/Customer/Tutorials';

const BroadcastsPage = React.lazy(() => import('@/pages/Customer/Broadcasts'));
const ApiDocsPage = React.lazy(() => import('@/pages/Customer/ApiDocs'));

// Páginas compartilhadas
import Documentation from '@/pages/Shared/Documentation';
import Marketplace from '@/pages/Shared/Marketplace';
import Profile from '@/pages/Shared/Profile';

// Página de setup inicial
import Setup from '@/pages/Setup/Setup';
import OnboardingPage from '@/pages/Setup/OnboardingPage';

// Outras páginas
import NotFound from '@/pages/NotFound';
import Unauthorized from '@/pages/Unauthorized';
import Widget from '@/pages/Widget';
import AsanaCallback from '@/pages/AsanaCallback';
import HubSpotCallback from '@/pages/HubSpotCallback';
import PayPalCallback from '@/pages/PayPalCallback';
import CanvaCallback from '@/pages/CanvaCallback';
import SupabaseCallback from '@/pages/SupabaseCallback';
// import ChangePassword from '../pages/ChangePassword';

const ChatRouteElement = (
  <PrivateRoute>
    <CustomerRoute>
      <MainLayout>
        <PermissionRoute resource="conversations" action="read">
          <Suspense
            fallback={<div className="flex items-center justify-center h-full">Carregando...</div>}
          >
            <ChatPage />
          </Suspense>
        </PermissionRoute>
      </MainLayout>
    </CustomerRoute>
  </PrivateRoute>
);

/**
 * Bookmarks antigos (`/contacts`, `/dashboard`, etc.) ainda apontam pra paths
 * curtos. Este componente lê o accountNumber ativo do auth store e redireciona
 * preservando path/query/hash pro novo formato `/app/accounts/{N}/...`.
 *
 * Sem accountNumber ativo (sessão sem workspace selecionado), volta pra raiz —
 * o SmartRedirect lida com setup/onboarding/login.
 */
function LegacyAccountRedirect() {
  const activeAccountNumber = useAuthStore(s => s.activeAccountNumber);
  const location = useLocation();
  if (!activeAccountNumber) {
    return <Navigate to="/" replace />;
  }
  const target = `/app/accounts/${activeAccountNumber}${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

const AppRouter = () => {
  return (
    <BrowserRouter>
      <RouterGuard>
        <Routes>
          {/* Redirecionamento inteligente da raiz baseado no tipo de usuário */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <SmartRedirect />
              </PrivateRoute>
            }
          />

          {/* Rotas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/confirm-email"
            element={
              <PublicRoute>
                <EmailConfirmation />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/confirmation"
            element={
              <PublicRoute>
                <EmailConfirmation />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/password/edit"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* Instagram OAuth Callback */}
          <Route
            path="/instagram/callback"
            element={
              <PublicRoute>
                <InstagramCallback />
              </PublicRoute>
            }
          />

          {/* Google OAuth Callback */}
          <Route
            path="/google/callback"
            element={
              <PublicRoute>
                <GoogleCallback />
              </PublicRoute>
            }
          />

          {/* Google Calendar OAuth Callback */}
          <Route
            path="/google-calendar/callback"
            element={
              <PublicRoute>
                <GoogleCalendarCallback />
              </PublicRoute>
            }
          />

          {/* Google Sheets OAuth Callback */}
          <Route
            path="/google-sheets/callback"
            element={
              <PublicRoute>
                <GoogleSheetsCallback />
              </PublicRoute>
            }
          />

          {/* GitHub OAuth Callback */}
          <Route
            path="/github/callback"
            element={
              <PublicRoute>
                <GitHubCallback />
              </PublicRoute>
            }
          />

          {/* Notion OAuth Callback */}
          <Route
            path="/notion/callback"
            element={
              <PublicRoute>
                <NotionCallback />
              </PublicRoute>
            }
          />

          {/* Stripe OAuth Callback */}
          <Route
            path="/stripe/callback"
            element={
              <PublicRoute>
                <StripeCallback />
              </PublicRoute>
            }
          />

          {/* Linear OAuth Callback */}
          <Route
            path="/linear/callback"
            element={
              <PublicRoute>
                <LinearCallback />
              </PublicRoute>
            }
          />

          {/* Monday OAuth Callback */}
          <Route
            path="/monday/callback"
            element={
              <PublicRoute>
                <MondayCallback />
              </PublicRoute>
            }
          />

          {/* Atlassian OAuth Callback */}
          <Route
            path="/atlassian/callback"
            element={
              <PublicRoute>
                <AtlassianCallback />
              </PublicRoute>
            }
          />

          {/* Asana OAuth Callback */}
          <Route
            path="/asana/callback"
            element={
              <PublicRoute>
                <AsanaCallback />
              </PublicRoute>
            }
          />

          {/* HubSpot OAuth Callback */}
          <Route
            path="/hubspot/callback"
            element={
              <PublicRoute>
                <HubSpotCallback />
              </PublicRoute>
            }
          />

          {/* PayPal OAuth Callback */}
          <Route
            path="/paypal/callback"
            element={
              <PublicRoute>
                <PayPalCallback />
              </PublicRoute>
            }
          />

          {/* Canva OAuth Callback */}
          <Route
            path="/canva/callback"
            element={
              <PublicRoute>
                <CanvaCallback />
              </PublicRoute>
            }
          />

          {/* Supabase OAuth Callback */}
          <Route
            path="/supabase/callback"
            element={
              <PublicRoute>
                <SupabaseCallback />
              </PublicRoute>
            }
          />

          {/* Microsoft OAuth Callback */}
          <Route
            path="/microsoft/callback"
            element={
              <PublicRoute>
                <MicrosoftCallback />
              </PublicRoute>
            }
          />

          {/* <Route path="/change-password" element={<ChangePassword />} /> */}

          {/* Public widget route (for website embeds) */}
          <Route
            path="/widget"
            element={
              <PublicRoute>
                <Widget />
              </PublicRoute>
            }
          />

          {/* Public survey response route (CSAT surveys) */}
          <Route
            path="/survey/responses/:uuid"
            element={
              <PublicRoute>
                <SurveyResponse />
              </PublicRoute>
            }
          />

          {/* Rota de Setup Inicial */}
          <Route path="/setup" element={<Setup />} />
          <Route path="/setup/onboarding" element={<OnboardingPage />} />

          {/* ============================================================ */}
          {/* LEGACY redirects — paths antigos sem accountNumber.            */}
          {/* Mantidos pra preservar bookmarks/links externos. Cada um       */}
          {/* redireciona pro novo path /app/accounts/{N}/... preservando    */}
          {/* params, query e hash.                                          */}
          {/* ============================================================ */}

          <Route
            path="/contacts"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/contacts/:contactId"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/contacts/scheduled-actions"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/broadcasts"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/api-docs"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/pipelines"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/pipelines/:pipelineId"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/follow-ups"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/conversations"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/conversations/:conversationId"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/tutorials"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/bots"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/channels"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/channels/new"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/channels/:id/settings"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard-app/:appId"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />

          {/* Agents legacy */}
          <Route path="/agents" element={<Navigate to="/agents/list" replace />} />
          <Route
            path="/agents/list"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/new"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/:id/edit"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/management"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/mcp-servers"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/custom-mcp-servers"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/tools"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/custom-tools"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />

          {/* Settings legacy (NÃO inclui /settings/admin/* — admin fica fora do bloco /app) */}
          <Route
            path="/settings/account"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/users"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/teams"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/teams/:teamId/add-users"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/labels"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/attributes"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/canned-responses"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/macros"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/custom-tools"
            element={<Navigate to="/agents/custom-tools" replace />}
          />
          <Route
            path="/settings/custom-mcp-servers"
            element={<Navigate to="/agents/custom-mcp-servers" replace />}
          />
          <Route
            path="/settings/integrations/webhooks"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/oauth-apps"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/dashboard-apps"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/slack"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/openai"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/bms"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/leadsquared"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/hubspot"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/shopify"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/linear"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/access-tokens"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/:integrationId"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/email-template-editor"
            element={
              <PrivateRoute>
                <LegacyAccountRedirect />
              </PrivateRoute>
            }
          />

          {/* ============================================================ */}
          {/* NOVO: bloco /app/accounts/:accountNumber/* (estilo Chatwoot)   */}
          {/* AccountGuard valida o número da URL contra as memberships do   */}
          {/* user e sincroniza o JWT antes de renderizar qualquer rota      */}
          {/* filha. Paths são RELATIVOS (sem leading slash).                */}
          {/* ============================================================ */}
          <Route path="/app/accounts/:accountNumber" element={<AccountGuard />}>
            <Route
              path="dashboard"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="dashboard" action="read">
                        <Dashboard />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route path="conversations" element={ChatRouteElement} />
            <Route path="conversations/:conversationId" element={ChatRouteElement} />

            <Route
              path="contacts"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="contacts" action="read">
                        <Contacts />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="contacts/:contactId"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="contacts" action="read">
                        <Contacts />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="contacts/scheduled-actions"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="contacts" action="read">
                        <ScheduledActions />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="broadcasts"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <React.Suspense
                        fallback={
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                          </div>
                        }
                      >
                        <BroadcastsPage />
                      </React.Suspense>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="api-docs"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <React.Suspense
                        fallback={
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                          </div>
                        }
                      >
                        <ApiDocsPage />
                      </React.Suspense>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="pipelines"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="pipelines" action="read">
                        <Pipelines />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="pipelines/:pipelineId"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="pipelines" action="read">
                        <PipelineKanban />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="follow-ups"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <FollowUps />
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="tutorials"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <Tutorials />
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="bots"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="bots" action="read">
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">🤖 Bots</h2>
                            <p className="text-muted-foreground">Página em desenvolvimento</p>
                          </div>
                        </div>
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="channels"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="channels" action="read">
                        <Channels />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="channels/new"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="channels" action="create">
                        <NewChannel />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="channels/:id/settings"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="channels" action="create">
                        <ChannelSettings />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="dashboard-app/:appId"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <DashboardAppPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="reports"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="reports" action="read">
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">📊 Relatórios</h2>
                            <p className="text-muted-foreground">Página em desenvolvimento</p>
                          </div>
                        </div>
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            {/* Agents */}
            <Route
              path="agents/list"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_agents" action="read">
                        <Agents />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/new"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_agents" action="create">
                        <Agents />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/:id/edit"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_agents" action="update">
                        <AgentEditPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/management"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_agents" action="read">
                        <Agents />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/mcp-servers"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_mcp_servers" action="read">
                        <MCPServers />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/custom-mcp-servers"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_custom_mcp_servers" action="read">
                        <CustomMCPServers />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/tools"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_tools" action="read">
                        <Tools />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="agents/custom-tools"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="ai_custom_tools" action="read">
                        <CustomTools />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />

            {/* Settings (não inclui admin) */}
            <Route
              path="settings/account"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="accounts" action="read">
                        <AccountSettings />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/users"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="users" action="read">
                        <Users />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/teams"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="teams" action="read">
                        <Teams />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/teams/:teamId/add-users"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="teams" action="create">
                        <AddUsers />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/labels"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="labels" action="read">
                        <Labels />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/attributes"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="custom_attribute_definitions" action="read">
                        <CustomAttributes />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/canned-responses"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="canned_responses" action="read">
                        <CannedResponses />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/macros"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="macros" action="read">
                        <Macros />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <Integrations />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/webhooks"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="webhooks" action="read">
                        <WebhooksPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/oauth-apps"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="oauth_applications" action="read">
                        <OAuthAppsPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/dashboard-apps"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="dashboard_apps" action="read">
                        <DashboardAppsPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/slack"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <SlackIntegrationPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/openai"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <OpenAIPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/bms"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <BMSPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/leadsquared"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <LeadSquaredPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/hubspot"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <HubSpotPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/shopify"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <ShopifyPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/linear"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <LinearPage />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/access-tokens"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="access_tokens" action="read">
                        <AccessTokens />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/integrations/:integrationId"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="integrations" action="read">
                        <div className="p-6">
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <h2 className="text-2xl font-bold mb-2">🔧 Configuração</h2>
                              <p className="text-muted-foreground">
                                Página de configuração em desenvolvimento
                              </p>
                            </div>
                          </div>
                        </div>
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="settings/email-template-editor"
              element={
                <PrivateRoute>
                  <CustomerRoute>
                    <MainLayout>
                      <PermissionRoute resource="message_templates" action="create">
                        <EmailTemplateEditor />
                      </PermissionRoute>
                    </MainLayout>
                  </CustomerRoute>
                </PrivateRoute>
              }
            />
          </Route>

          {/* Rotas específicas de canais foram integradas no fluxo unificado do NewChannel */}
          {/* Meta e WhatsApp Cloud agora são parte do componente NewChannel */}

          {/* Admin Settings Routes — fora do bloco /app/accounts (admin é cross-tenant) */}
          <Route
            path="/settings/admin"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="installation_configs" action="manage">
                      <AdminSettingsLayout />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          >
            <Route
              path="email"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <SmtpConfig />
                </Suspense>
              }
            />
            <Route
              path="storage"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <StorageConfig />
                </Suspense>
              }
            />
            <Route
              path="social-login"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <SocialLoginConfig />
                </Suspense>
              }
            />
            <Route
              path="channels"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <ChannelConfig />
                </Suspense>
              }
            />
            <Route
              path="openai"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <OpenAIConfig />
                </Suspense>
              }
            />
            <Route
              path="integrations"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <IntegrationsConfig />
                </Suspense>
              }
            />
            <Route
              path="inbound-email"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <InboundEmailConfig />
                </Suspense>
              }
            />
            <Route
              path="frontend-runtime"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <FrontendRuntimeConfig />
                </Suspense>
              }
            />
          </Route>

          {/* Rotas Compartilhadas */}
          <Route
            path="/documentation"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Documentation />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/marketplace"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Marketplace />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* Super-admin panel (platform operators only). Wrapped in MainLayout
              so the sidebar (and its "Voltar para o app" shortcut) stays visible. */}
          <Route
            path="/super-admin/accounts"
            element={
              <PrivateRoute>
                <SuperAdminRoute>
                  <MainLayout>
                    <SuperAdminAccounts />
                  </MainLayout>
                </SuperAdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/super-admin/accounts/:accountId/members"
            element={
              <PrivateRoute>
                <SuperAdminRoute>
                  <MainLayout>
                    <SuperAdminAccountMembers />
                  </MainLayout>
                </SuperAdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <PrivateRoute>
                <SuperAdminRoute>
                  <MainLayout>
                    <SuperAdminUsers />
                  </MainLayout>
                </SuperAdminRoute>
              </PrivateRoute>
            }
          />

          {/* Rota 403 - Sem permissão */}
          <Route
            path="/unauthorized"
            element={
              <PrivateRoute>
                <Unauthorized />
              </PrivateRoute>
            }
          />

          {/* Rota 404 - Página não encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouterGuard>
    </BrowserRouter>
  );
};

export default AppRouter;
