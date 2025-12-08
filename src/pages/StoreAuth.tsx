import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Store, ShieldAlert } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

type AppRole = 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR';

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

export default function StoreAuth() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();

  // Fetch store info on mount
  useEffect(() => {
    async function fetchStore() {
      if (!storeSlug) {
        setStoreError('No store specified');
        setStoreLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, slug, logo_url, primary_color')
          .eq('slug', storeSlug)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          setStoreError(`Store "${storeSlug}" not found`);
        } else {
          setStore(data);
        }
      } catch (err) {
        console.error('Error fetching store:', err);
        setStoreError('Failed to load store');
      } finally {
        setStoreLoading(false);
      }
    }

    fetchStore();
  }, [storeSlug]);

  // Check if user is already logged in and has store access
  useEffect(() => {
    async function checkAccess() {
      if (user && profile && store) {
        // OWNER role is not allowed to log in via store portal
        if (profile.role === 'OWNER') {
          toast.error('Owner accounts cannot log in via store portals. Please use the main login.');
          await supabase.auth.signOut();
          return;
        }

        // Check if user has access to this specific store
        const { data: accessData } = await supabase
          .rpc('get_user_accessible_stores', { p_user_id: user.id });

        const hasAccess = accessData?.some(
          (s: { store_id: string }) => s.store_id === store.id
        );

        if (!hasAccess) {
          toast.error('You do not have access to this store');
          await supabase.auth.signOut();
          return;
        }

        // Redirect to role-based dashboard within the store
        redirectToRoleDashboard(profile.role as AppRole);
      }
    }

    checkAccess();
  }, [user, profile, store, navigate]);

  const redirectToRoleDashboard = (userRole: AppRole) => {
    const routes: Record<AppRole, string> = {
      ADMIN: 'admin/dashboard',
      LEADS: 'leads/dashboard',
      CALLING: 'calling/dashboard',
      FOLLOWUP: 'followup/dashboard',
      LOGISTICS: 'logistics/orders',
      MARKETING: 'marketing/dashboard',
      MANAGER: 'manager/dashboard',
      HR: 'hr/dashboard',
    };
    navigate(`/${storeSlug}/${routes[userRole] || 'admin/dashboard'}`);
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
    
    if (!store) {
      toast.error('Store not loaded');
      return;
    }

    setIsLoading(true);
    
    // First sign in
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Get user profile to check role
    const userId = data.user?.id;
    if (!userId) {
      toast.error('Login failed');
      setIsLoading(false);
      return;
    }

    // Get profile to check role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Block OWNER from logging in via store portal
    if (profileData?.role === 'OWNER') {
      toast.error('Owner accounts cannot log in via store portals. Please use the main login at /auth');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    // Check if user has access to this store
    const { data: accessData } = await supabase
      .rpc('get_user_accessible_stores', { p_user_id: userId });

    const hasAccess = accessData?.some(
      (s: { store_id: string }) => s.store_id === store.id
    );

    if (!hasAccess) {
      toast.error('You do not have access to this store. Please contact your administrator.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    toast.success('Logged in successfully');
    setIsLoading(false);
    
    // The useEffect will handle redirect after profile loads
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Store className="w-12 h-12 mx-auto text-destructive" />
              <h1 className="text-xl font-bold text-destructive">Store Not Found</h1>
              <p className="text-muted-foreground">{storeError || 'This store does not exist or is not active.'}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-background p-4"
      style={{ '--store-primary': store.primary_color || undefined } as React.CSSProperties}
    >
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          {store.logo_url ? (
            <img 
              src={store.logo_url} 
              alt={store.name} 
              className="w-16 h-16 object-contain mx-auto mb-4 rounded-xl"
            />
          ) : (
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4"
              style={{ backgroundColor: store.primary_color || 'hsl(var(--primary))' }}
            >
              <Store className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
          <p className="text-muted-foreground mt-1">Staff Portal</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access {store.name}</CardDescription>
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
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                style={{ backgroundColor: store.primary_color || undefined }}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Need access?</p>
                  <p>Contact your store administrator to get login credentials for this store.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
