import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppRole = 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (profile) {
        if (!profile.role) {
          // No role assigned - stay on page with message
          return;
        }
        const routes: Record<AppRole, string> = {
          ADMIN: '/admin/dashboard',
          LEADS: '/leads/dashboard',
          CALLING: '/calling/dashboard',
          FOLLOWUP: '/followup/dashboard',
          LOGISTICS: '/logistics/orders',
          MARKETING: '/marketing/dashboard',
          MANAGER: '/manager/dashboard',
          HR: '/hr/dashboard',
        };
        navigate(routes[profile.role] || '/calling/dashboard');
      }
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
