import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
  children?: React.ReactNode;
}

// Map roles to their default dashboard routes
const ROLE_DEFAULT_ROUTES: Record<AppRole, string> = {
  OWNER: '/admin/dashboard',
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager/dashboard',
  LEADS: '/leads/dashboard',
  CALLING: '/calling/dashboard',
  FOLLOWUP: '/followup/dashboard',
  LOGISTICS: '/logistics/dashboard',
  MARKETING: '/marketing/dashboard',
  HR: '/hr/dashboard',
  ACCOUNTANT: '/accounting/dashboard',
  WAREHOUSE: '/inventory/stock-summary',
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const location = useLocation();
  const hasShownToast = useRef(false);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, redirect to auth
  if (!profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user's effective role is in allowed roles
  const isAllowed = allowedRoles.includes(effectiveRole);

  // If not allowed, redirect to their proper dashboard
  if (!isAllowed) {
    // Show toast only once per redirect attempt
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast.error('Access denied. You do not have permission to view this page.');
    }
    
    const redirectTo = ROLE_DEFAULT_ROUTES[effectiveRole] || '/auth';
    return <Navigate to={redirectTo} replace />;
  }

  // Reset toast flag when access is allowed
  hasShownToast.current = false;

  // Render children or Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
}
