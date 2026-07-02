import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'SALES_MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE' | 'STAFF';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [brandingTimedOut, setBrandingTimedOut] = useState(false);
  const { signIn, user, profile } = useAuth();
  const { branding, isLoading: brandingLoading } = useBranding();
  const navigate = useNavigate();

  // Timeout for branding - show fallback after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (brandingLoading) {
        setBrandingTimedOut(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [brandingLoading]);

  // Reset timeout flag when branding loads
  useEffect(() => {
    if (!brandingLoading && branding) {
      setBrandingTimedOut(false);
    }
  }, [brandingLoading, branding]);

  const brandName = branding?.brand_name;
  const logoUrl = branding?.logo_url;
  const showBrandingSkeleton = brandingLoading && !brandingTimedOut;

  useEffect(() => {
    if (user && profile) {
      // Check if user is inactive
      if (profile.is_active === false) {
        toast.error('Your account has been deactivated. Please contact admin.');
        // Sign out the inactive user
        import('@/integrations/supabase/client').then(({ supabase }) => {
          supabase.auth.signOut();
        });
        return;
      }
      
      if (!profile.role) {
        toast.error('No role assigned to your account. Please contact admin.');
        return;
      }
      redirectToRoleDashboard(profile.role as AppRole);
    }
  }, [user, profile, navigate]);

  const redirectToRoleDashboard = (userRole: AppRole) => {
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
      STAFF: '/my-tasks',
    };
    navigate(routes[userRole] || '/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email: email.trim(), password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    
    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in successfully');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          {showBrandingSkeleton ? (
            <>
              <Skeleton className="w-14 h-14 mx-auto mb-4 rounded-xl" />
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-56 mx-auto" />
            </>
          ) : (
            <>
              {logoUrl ? (
                <img 
                  src={`${logoUrl}?t=${branding?.updated_at}`} 
                  alt="Logo" 
                  className="w-14 h-14 object-contain mx-auto mb-4 rounded-xl"
                />
              ) : (
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4">
                  <span className="text-xl font-bold text-primary-foreground">
                    {brandName?.[0] || 'E'}
                  </span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-foreground">{brandName || 'ERP System'}</h1>
              <p className="text-muted-foreground mt-1">Manage leads, calls, and orders</p>
            </>
          )}
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="text"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <button
                type="button"
                className="mt-2 w-full text-sm text-primary hover:underline"
                onClick={() => navigate('/auth/forgot-password')}
              >
                Forgot your password?
              </button>
            </form>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Need an account?</p>
                  <p>Only administrators can create new accounts. Please contact your admin to get access.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
