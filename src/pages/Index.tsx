import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [waitingForAuth, setWaitingForAuth] = useState(true);

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

  useEffect(() => {
    // Wait for initial auth check or magic link processing
    if (loading || waitingForAuth) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!profile) return;
    
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
      MANAGER: '/manager/dashboard',
      HR: '/hr/dashboard',
    };

    const targetPath = routes[profile.role] || '/calling/dashboard';
    navigate(targetPath);
  }, [user, profile, loading, navigate, waitingForAuth]);

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
