import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';

const SmartRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  const activeAccountNumber = useAuthStore(s => s.activeAccountNumber);
  const accounts = useAuthStore(s => s.accounts);

  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Resolve the workspace to land on. Prefer the JWT's active account number;
  // fall back to the first membership for users whose JWT is somehow missing it.
  const fallbackNumber = accounts.find(a => typeof a.number === 'number')?.number;
  const targetNumber = activeAccountNumber ?? fallbackNumber;

  if (!targetNumber) {
    // No accounts at all — likely a super-admin without memberships. Send them
    // to the admin panel rather than a 404.
    return <Navigate to="/super-admin/accounts" replace />;
  }

  return <Navigate to={`/app/accounts/${targetNumber}/conversations`} replace />;
};

export default SmartRedirect;
