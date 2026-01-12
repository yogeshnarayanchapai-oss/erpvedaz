import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  is_active: boolean;
  daily_target: number | null;
  default_store_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 5000;
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), TIMEOUT_MS)
      );
      
      // Create fetch promise
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      // Race between fetch and timeout
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (data && !error) {
        setProfile(data as Profile);
      } else if (error && retryCount < MAX_RETRIES) {
        // Retry on error
        console.warn(`Profile fetch failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
      } else {
        console.error('Profile fetch failed after retries:', error);
        // Set profile to null to allow app to handle gracefully
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (retryCount < MAX_RETRIES) {
        console.warn(`Profile fetch error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
      } else {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        // Only update state synchronously
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            if (mounted) {
              fetchProfile(currentSession.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // SECURITY: Role is NOT accepted from client - assigned server-side only
  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          // SECURITY: Do NOT pass role - it's assigned by handle_new_user trigger
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear local state first
    setProfile(null);
    setUser(null);
    setSession(null);
    
    try {
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // If session not found error, it's already logged out - that's fine
      if (error && !error.message.includes('session_not_found') && !error.message.includes('Session not found')) {
        console.error('Sign out error:', error);
      }
    } catch (err) {
      // Handle any network or unexpected errors gracefully
      console.error('Sign out exception:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
