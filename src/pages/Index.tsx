import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'SALES_MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [waitingForAuth, setWaitingForAuth] = useState(true);
  const [profileTimeout, setProfileTimeout] = useState(false);

  // Check if URL has auth tokens (from magic link redirect)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('refresh_token');
    
    if (hasAuthTokens) {
      // Wait for Supabase to process the tokens
      const timeout = setTimeout(() => {
        setWaitingForAuth(false);
      }, 3000); // Give 3 seconds max for auth to complete
      
      return () => clearTimeout(timeout);
    } else {
      setWaitingForAuth(false);
    }
  }, []);

  // Once user is loaded, stop waiting
  useEffect(() => {
    if (user) {
      setWaitingForAuth(false);
    }
  }, [user]);

  // Timeout for profile loading - if profile doesn't load in 10 seconds, show error
  useEffect(() => {
    if (!loading && user && !profile) {
      const timeout = setTimeout(() => {
        setProfileTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    }
    // Reset timeout if profile loads
    if (profile) {
      setProfileTimeout(false);
    }
  }, [loading, user, profile]);

  useEffect(() => {
    // Wait for initial auth check or magic link processing
    if (loading || waitingForAuth) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!profile) return; // Wait for profile (with timeout above)
    
    if (!profile.role) {
      // No role assigned - stay on page with message
      return;
    }

    // Role-based route mapping (no store slug - context handles store)
    const routes: Record<AppRole, string> = {
      OWNER: '/admin/dashboard',
      ADMIN: '/admin/dashboard',
      LEADS: '/leads/dashboard',
      CALLING: '/calling/dashboard',
      FOLLOWUP: '/followup/dashboard',
      LOGISTICS: '/logistics/orders',
      MARKETING: '/marketing/dashboard',
      MANAGER: '/admin/dashboard',
      SALES_MANAGER: '/admin/sales/dashboard',
      HR: '/hr/dashboard',
      ACCOUNTANT: '/admin/accounting/dashboard-new',
      WAREHOUSE: '/admin/inventory/stock-summary',
    };

    const targetPath = routes[profile.role] || '/calling/dashboard';
    navigate(targetPath);
  }, [user, profile, loading, navigate, waitingForAuth]);

  // Handle profile timeout - allow user to retry or logout
  if (profileTimeout && user && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4 p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Loading taking too long</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to load your profile. Please check your connection and try again.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
          <Button 
            variant="destructive"
            onClick={async () => {
              await signOut();
              navigate('/auth');
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="ml-2 text-muted-foreground">
        {waitingForAuth ? 'Authenticating...' : 'Loading...'}
      </p>
    </div>
  );
};

export default Index;
