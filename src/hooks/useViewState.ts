import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect } from 'react';

export type ViewSection = 'all_leads' | 'all_orders';

interface ViewState {
  section: ViewSection;
  last_seen_at: string | null;
}

export function useViewState() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-view-state', user?.id],
    queryFn: async (): Promise<Record<ViewSection, string | null>> => {
      if (!user?.id) return { all_leads: null, all_orders: null };

      const { data, error } = await supabase
        .from('user_view_state')
        .select('section, last_seen_at')
        .eq('user_id', user.id);

      if (error) throw error;

      const stateMap: Record<ViewSection, string | null> = {
        all_leads: null,
        all_orders: null,
      };

      data?.forEach((row) => {
        if (row.section === 'all_leads' || row.section === 'all_orders') {
          stateMap[row.section] = row.last_seen_at;
        }
      });

      return stateMap;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

export function useMarkSectionSeen(section: ViewSection) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('user_view_state')
        .upsert(
          {
            user_id: user.id,
            section,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,section' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate badges and view state
      queryClient.invalidateQueries({ queryKey: ['user-view-state'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });

  const markSeen = useCallback(() => {
    if (user?.id) {
      mutation.mutate();
    }
  }, [user?.id, mutation]);

  return { markSeen, isPending: mutation.isPending };
}

// Hook to auto-mark section as seen when component mounts and data is loaded
export function useAutoMarkSeen(section: ViewSection, isDataLoaded: boolean) {
  const { markSeen } = useMarkSectionSeen(section);

  useEffect(() => {
    if (isDataLoaded) {
      // Small delay to ensure data is rendered
      const timeout = setTimeout(() => {
        markSeen();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isDataLoaded, markSeen]);
}
