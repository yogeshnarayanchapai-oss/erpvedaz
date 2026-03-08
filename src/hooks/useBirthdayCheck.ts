import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

/** Returns { isSelfBirthday, otherBirthdayNames } with minimal cost */
export function useBirthdayCheck() {
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();

  const { data } = useQuery({
    queryKey: ['birthday-check', storeId],
    queryFn: async () => {
      if (!storeId) return { selfName: null, others: [] as string[] };

      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, full_name, birth_date')
        .eq('store_id', storeId)
        .eq('status', 'Active')
        .not('birth_date', 'is', null);

      if (!employees) return { selfName: null, others: [] as string[] };

      const today = new Date();
      const m = today.getMonth();
      const d = today.getDate();

      let selfName: string | null = null;
      const others: string[] = [];

      for (const e of employees) {
        if (!e.birth_date) continue;
        const bd = new Date(e.birth_date);
        if (bd.getMonth() === m && bd.getDate() === d) {
          if (e.user_id === profile?.id) {
            selfName = e.full_name;
          } else {
            others.push(e.full_name);
          }
        }
      }

      return { selfName, others };
    },
    enabled: !!storeId && !!profile?.id,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  return {
    isSelfBirthday: !!data?.selfName,
    selfName: data?.selfName || profile?.name || '',
    otherBirthdayNames: data?.others || [],
  };
}
