import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { switchAccount } from '@/services/auth/authService';

/**
 * Gate for the `/app/accounts/:accountNumber/*` route tree. Three jobs:
 *
 *   1. Validate that the URL's accountNumber matches an account the user can
 *      access (membership or super-admin). If not, redirect to the user's own
 *      active workspace.
 *   2. Sync the auth store: if URL number differs from the JWT's active number,
 *      call switchAccount so subsequent API requests are scoped correctly.
 *   3. While the switch is in-flight, render a lightweight placeholder so
 *      child components don't fire requests against the wrong workspace.
 *
 * The Auth service treats the JWT as the source of truth for `account_id`
 * scoping; the URL is presentational. We must keep them aligned to prevent
 * cross-account data leaks (e.g. user manually edits the URL).
 */
export default function AccountGuard() {
  const params = useParams<{ accountNumber: string }>();
  const location = useLocation();

  const accounts = useAuthStore(s => s.accounts);
  const activeAccountNumber = useAuthStore(s => s.activeAccountNumber);
  const superAdmin = useAuthStore(s => s.superAdmin);

  const urlNumberRaw = Number(params.accountNumber);
  const urlNumber = Number.isFinite(urlNumberRaw) ? urlNumberRaw : null;

  const userMembershipNumbers = accounts
    .map(a => a.number)
    .filter((n): n is number => typeof n === 'number');

  const canAccess =
    urlNumber !== null && (superAdmin || userMembershipNumbers.includes(urlNumber));

  const [switching, setSwitching] = useState(false);
  const switchedTo = useRef<number | null>(null);

  useEffect(() => {
    if (!canAccess || urlNumber === null) return;
    if (urlNumber === activeAccountNumber) return;
    if (switchedTo.current === urlNumber) return;

    switchedTo.current = urlNumber;
    setSwitching(true);
    switchAccount({ number: urlNumber })
      .catch(err => {
        console.error('AccountGuard: failed to switch account from URL:', err);
        switchedTo.current = null;
      })
      .finally(() => setSwitching(false));
  }, [urlNumber, activeAccountNumber, canAccess]);

  if (urlNumber === null) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!canAccess) {
    const fallback = activeAccountNumber ?? userMembershipNumbers[0];
    if (fallback) {
      return <Navigate to={`/app/accounts/${fallback}/conversations`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (switching) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Trocando workspace...
      </div>
    );
  }

  return <Outlet />;
}
