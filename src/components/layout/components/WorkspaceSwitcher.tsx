import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Building2, Check, ChevronsUpDown, Shield } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@evoapi/design-system';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { switchAccount } from '@/services/auth/authService';
import { listAccounts, AdminAccount } from '@/services/admin/adminService';

interface WorkspaceSwitcherProps {
  isCollapsed: boolean;
  popoverSide?: 'right' | 'bottom' | 'top' | 'left';
}

interface WorkspaceItem {
  id: string;
  number?: number;
  name: string;
  slug?: string;
  isMember: boolean;
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Workspace selector pinned inside the sidebar.
 *
 * Regular users see only the accounts they're a member of (sourced from the
 * JWT-populated `authStore.accounts`). Super admins see every account on the
 * platform, fetched once via `/api/v1/admin/accounts`, with a marker showing
 * which ones they hold a scoped role in. Clicking any entry reissues the JWT
 * with a new `active_account_id` and reloads the app so caches and stores
 * pick up the new scope.
 */
export default function WorkspaceSwitcher({ isCollapsed, popoverSide = 'right' }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const insideAdminPanel = location.pathname.startsWith('/super-admin');
  const accounts = useAuthStore(s => s.accounts);
  const activeAccountId = useAuthStore(s => s.activeAccountId);
  const activeAccountNumber = useAuthStore(s => s.activeAccountNumber);
  const superAdmin = useAuthStore(s => s.superAdmin);

  const [open, setOpen] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // Super admins get the full account list from the admin API; regular users
  // stick to the JWT-bundled membership list. Fetch on first open only.
  useEffect(() => {
    if (!open || !superAdmin || adminAccounts.length > 0 || loadingAdmin) return;
    setLoadingAdmin(true);
    listAccounts()
      .then(setAdminAccounts)
      .catch(err => console.error('Failed to load admin accounts:', err))
      .finally(() => setLoadingAdmin(false));
  }, [open, superAdmin, adminAccounts.length, loadingAdmin]);

  const workspaceItems: WorkspaceItem[] = useMemo(() => {
    if (superAdmin) {
      const memberIds = new Set(accounts.map(a => a.id));
      return adminAccounts.map(a => ({
        id: a.id,
        number: (a as AdminAccount & { number?: number }).number,
        name: a.name,
        slug: a.slug,
        isMember: memberIds.has(a.id)
      }));
    }
    return accounts.map(a => ({ id: a.id, number: a.number, name: a.name, slug: a.slug, isMember: true }));
  }, [superAdmin, adminAccounts, accounts]);

  const activeWorkspace = useMemo(() => {
    const byActive = workspaceItems.find(w => w.id === activeAccountId);
    if (byActive) return byActive;
    // When super admin switched to a non-member account, the admin list may
    // still be loading — fall back to whatever name we know from `accounts`.
    const fromMemberships = accounts.find(a => a.id === activeAccountId);
    if (fromMemberships) {
      return {
        id: fromMemberships.id,
        number: fromMemberships.number,
        name: fromMemberships.name,
        slug: fromMemberships.slug,
        isMember: true,
      };
    }
    return null;
  }, [workspaceItems, accounts, activeAccountId]);

  const handlePick = async (item: WorkspaceItem) => {
    if (item.id === activeAccountId || switching) return;
    setSwitching(item.id);
    try {
      await switchAccount(item.number !== undefined ? { number: item.number } : item.id);
      // Navigate to the new workspace's home using the Chatwoot-style URL
      // when we know the number; otherwise reload as a safety net.
      const targetNumber = item.number ?? activeAccountNumber;
      if (targetNumber) {
        navigate(`/app/accounts/${targetNumber}/conversations`, { replace: true });
        // A reload still happens to fully reset stores/caches scoped to the
        // previous account — same behavior as before, just at the new URL.
        setTimeout(() => window.location.reload(), 50);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch workspace:', err);
      setSwitching(null);
    }
  };

  const formatLabel = (w: WorkspaceItem | null) => {
    if (!w) return 'Selecione um workspace';
    return w.number ? `#${w.number} ${w.name}` : w.name;
  };

  const triggerLabel = formatLabel(activeWorkspace);

  if (isCollapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="w-full flex items-center justify-center h-10 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
                aria-label={triggerLabel}
              >
                <Building2 className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{triggerLabel}</TooltipContent>
        </Tooltip>
        <WorkspaceList
          items={workspaceItems}
          activeId={activeAccountId}
          switching={switching}
          loading={loadingAdmin}
          superAdmin={superAdmin}
          insideAdminPanel={insideAdminPanel}
          side={popoverSide}
          onPick={handlePick}
          onManage={() => { setOpen(false); navigate(insideAdminPanel ? '/' : '/super-admin/accounts'); }}
        />
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground text-sm"
          title={activeWorkspace ? `ID: ${activeWorkspace.id}` : undefined}
        >
          <Building2 className="h-4 w-4 flex-shrink-0 text-primary" />
          <div className="flex-1 min-w-0 text-left">
            <div className="truncate font-medium leading-tight">{triggerLabel}</div>
          </div>
          <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <WorkspaceList
        items={workspaceItems}
        activeId={activeAccountId}
        switching={switching}
        loading={loadingAdmin}
        superAdmin={superAdmin}
        insideAdminPanel={insideAdminPanel}
        side={popoverSide}
        onPick={handlePick}
        onManage={() => { setOpen(false); navigate(insideAdminPanel ? '/' : '/super-admin/accounts'); }}
      />
    </Popover>
  );
}

interface WorkspaceListProps {
  items: WorkspaceItem[];
  activeId: string | null;
  switching: string | null;
  loading: boolean;
  superAdmin: boolean;
  insideAdminPanel: boolean;
  side?: 'right' | 'bottom' | 'top' | 'left';
  onPick: (item: WorkspaceItem) => void;
  onManage: () => void;
}

function WorkspaceList({ items, activeId, switching, loading, superAdmin, insideAdminPanel, side = 'right', onPick, onManage }: WorkspaceListProps) {
  return (
    <PopoverContent align="start" side={side} sideOffset={8} collisionPadding={8} className="w-64 p-1">
      <div className="px-2 py-1.5 text-xs text-muted-foreground">
        {superAdmin ? 'Todos os workspaces' : 'Seus workspaces'}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading && superAdmin && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">Carregando...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhum workspace</div>
        )}
        {items.map(item => {
          const isActive = item.id === activeId;
          const isBusy = switching === item.id;
          return (
            <button
              key={item.id}
              disabled={isBusy}
              onClick={() => onPick(item)}
              title={`ID: ${item.id}`}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left',
                isActive ? 'bg-accent' : 'hover:bg-accent',
                isBusy && 'opacity-50 cursor-wait'
              )}
            >
              <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  {item.number ? <span className="text-muted-foreground mr-1">#{item.number}</span> : null}
                  {item.name}
                </div>
              </div>
              {!item.isMember && superAdmin && (
                <span title="Acesso como super admin" className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  admin
                </span>
              )}
              {isActive && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      {superAdmin && (
        <>
          <div className="border-t my-1" />
          <button
            onClick={onManage}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent text-primary font-medium"
          >
            {insideAdminPanel ? (
              <ArrowLeft className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            <span className="flex-1 text-left">
              {insideAdminPanel ? 'Voltar para o app' : 'Painel Super Admin'}
            </span>
          </button>
        </>
      )}
    </PopoverContent>
  );
}
