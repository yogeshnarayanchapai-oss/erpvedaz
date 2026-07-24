import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve the current authenticated user's Active employee record.
 *
 * Root-cause fix: some users have duplicate accounts / mismatched user_id
 * linkages, so a strict `user_id + status=Active` lookup misses them and
 * hides Check-in / Tasks buttons.
 *
 * Resolution order:
 *   1. Active employee where employees.user_id = auth.uid()
 *   2. Any employee (any status) linked by user_id — auto-reactivated
 *   3. Active employee whose email matches the auth user's email
 *      (email-based fallback + auto-heal user_id link)
 */
export async function resolveActiveEmployee(): Promise<{
  id: string;
  store_id: string | null;
  department_id: string | null;
  full_name: string | null;
} | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;

  // 1. Active by user_id
  const { data: active } = await supabase
    .from('employees')
    .select('id, store_id, department_id, full_name')
    .eq('user_id', user.id)
    .eq('status', 'Active')
    .maybeSingle();
  if (active) return active as any;

  // 2. Any status by user_id → reactivate
  const { data: linked } = await supabase
    .from('employees')
    .select('id, store_id, department_id, full_name, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (linked) {
    if ((linked as any).status !== 'Active') {
      await supabase.from('employees').update({ status: 'Active' } as any).eq('id', (linked as any).id);
    }
    return linked as any;
  }

  // 3. Email fallback → also heal user_id
  const email = user.email;
  if (!email) return null;
  const { data: byEmail } = await supabase
    .from('employees')
    .select('id, store_id, department_id, full_name, user_id, status')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmail) {
    const patch: any = {};
    if (!(byEmail as any).user_id) patch.user_id = user.id;
    if ((byEmail as any).status !== 'Active') patch.status = 'Active';
    if (Object.keys(patch).length) {
      await supabase.from('employees').update(patch).eq('id', (byEmail as any).id);
    }
    return byEmail as any;
  }

  return null;
}
