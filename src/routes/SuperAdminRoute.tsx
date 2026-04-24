import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface SuperAdminRouteProps {
  children: ReactNode;
}

/**
 * Guard for /super-admin/* pages. The `super_admin` claim is issued by the
 * Auth service JWT (Fase 1.4) and cached in the auth store on login/validate.
 * Anyone without the claim gets bounced to /unauthorized.
 */
const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const superAdmin = useAuthStore(s => s.superAdmin);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!superAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
