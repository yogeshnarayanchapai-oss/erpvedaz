import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
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
  
  // Prevent duplicate concurrent fetches
  const fetchingRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 1;
    
    // Skip if already fetching for same user
    if (fetchingRef.current === userId && retryCount === 0) return;
    fetchingRef.current = userId;
    
    try {
      // No artificial timeout - let Supabase handle it naturally
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, role, is_active, daily_target, default_store_id')
        .eq('id', userId)
        .maybeSingle();
      
      // Check if we're still interested in this user
      if (fetchingRef.current !== userId) return;
      
      if (data && !error) {
        setProfile(data as Profile);
      } else if (error && retryCount < MAX_RETRIES) {
        console.warn(`Profile fetch failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        retryTimerRef.current = setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
      } else {
        console.error('Profile fetch failed:', error);
        setProfile(null);
      }
    } catch (err) {
      if (fetchingRef.current !== userId) return;
      console.error('Error fetching profile:', err);
      if (retryCount < MAX_RETRIES) {
        retryTimerRef.current = setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
      } else {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Only fetch if getSession hasn't already handled this
          if (initialSessionHandled) {
            setTimeout(() => {
              if (mounted) fetchProfile(currentSession.user.id);
            }, 0);
          }
        } else {
          setProfile(null);
          fetchingRef.current = null;
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session (primary fetch path)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      initialSessionHandled = true;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      fetchingRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name },
      },
    });
    return { error };
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    setSession(null);
    fetchingRef.current = null;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    
    // Clear user-specific localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('lead_draft_') ||
          key.startsWith('cart_') ||
          key.startsWith('notification_') ||
          key.startsWith('lead_notifications_') ||
          key.includes('_cache_') ||
          key.includes('tanstack') ||
          key.includes('react-query')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    
    // Clear runtime caches
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (name.includes('supabase') || name.includes('api') || name.includes('runtime')) {
            await caches.delete(name);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to clear caches:', e);
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('session_not_found') && !error.message.includes('Session not found')) {
        console.error('Sign out error:', error);
      }
    } catch (err) {
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