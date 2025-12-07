import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Zap, ShieldAlert } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

type AppRole = 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, profile } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const brandName = branding?.brand_name || 'Zivkart OS';
  const logoUrl = branding?.logo_url;

  useEffect(() => {
    if (user && profile) {
      if (!profile.role) {
        toast.error('No role assigned to your account. Please contact admin.');
        return;
      }
      redirectToRoleDashboard(profile.role);
    }
  }, [user, profile, navigate]);

  const redirectToRoleDashboard = (userRole: AppRole) => {
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
          {logoUrl ? (
            <img 
              src={`${logoUrl}?t=${branding?.updated_at}`} 
              alt="Logo" 
              className="w-14 h-14 object-contain mx-auto mb-4 rounded-xl"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{brandName}</h1>
          <p className="text-muted-foreground mt-1">Manage leads, calls, and orders</p>
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
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
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
