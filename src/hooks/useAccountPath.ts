import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Returns a builder that prefixes any in-app path with the
 * `/app/accounts/:accountNumber` segment — the Chatwoot-style URL scheme.
 *
 * Source of truth (in priority order):
 *   1. The `accountNumber` URL param (when the caller is already inside the
 *      scoped route tree)
 *   2. `activeAccountNumber` in the auth store (hydrated from the JWT)
 *
 * If neither is available the builder returns the input unchanged so callers
 * sitting outside the scoped routes (auth pages, super-admin) still work.
 */
export function useAccountPath() {
  const params = useParams<{ accountNumber?: string }>();
  const storeNumber = useAuthStore(s => s.activeAccountNumber);

  const fromParam = params.accountNumber ? Number(params.accountNumber) : null;
  const accountNumber = Number.isFinite(fromParam) && fromParam !== null ? fromParam : storeNumber;

  return useCallback(
    (path: string): string => {
      if (!accountNumber) return path;
      const normalized = path.startsWith('/') ? path : `/${path}`;
      return `/app/accounts/${accountNumber}${normalized}`;
    },
    [accountNumber],
  );
}

/**
 * Hook variant for callers that only need the active account number, e.g.
 * to navigate to the workspace root after a switch.
 */
export function useActiveAccountNumber(): number | null {
  const params = useParams<{ accountNumber?: string }>();
  const storeNumber = useAuthStore(s => s.activeAccountNumber);
  const fromParam = params.accountNumber ? Number(params.accountNumber) : null;
  return Number.isFinite(fromParam) && fromParam !== null ? fromParam : storeNumber;
}
