import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';
import { toast } from 'sonner';

export interface HoldLedgerEntry {
  id: string;
  employee_id: string;
  store_id: string | null;
  entry_type: 'HOLD' | 'RELEASE';
  amount: number;
  month_start: string | null;
  notes: string | null;
  payroll_record_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EmployeeHoldSummary {
  employee_id: string;
  full_name: string;
  total_held: number;
  total_released: number;
  balance: number;
}

// Admin: list all employees with their hold summary
export function useCompanyHoldSummary() {
  return useQuery({
    queryKey: ['company-hold-summary', 'all-stores'],
    queryFn: async (): Promise<EmployeeHoldSummary[]> => {
      const { data, error } = await supabase
        .from('company_hold_ledger')
        .select('employee_id, entry_type, amount, employees:employee_id(full_name)');
      if (error) throw error;
      const map = new Map<string, EmployeeHoldSummary>();
      (data || []).forEach((r: any) => {
        const id = r.employee_id;
        if (!map.has(id)) {
          map.set(id, { employee_id: id, full_name: r.employees?.full_name || '-', total_held: 0, total_released: 0, balance: 0 });
        }
        const s = map.get(id)!;
        if (r.entry_type === 'HOLD') s.total_held += Number(r.amount);
        else s.total_released += Number(r.amount);
        s.balance = s.total_held - s.total_released;
      });
      return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
    },
  });
}

// Ledger entries for a specific employee
export function useEmployeeHoldLedger(employeeId: string | null) {
  return useQuery({
    queryKey: ['company-hold-ledger', employeeId],
    queryFn: async (): Promise<HoldLedgerEntry[]> => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('company_hold_ledger')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HoldLedgerEntry[];
    },
    enabled: !!employeeId,
  });
}

// Staff: own ledger via auth.uid → employees → ledger
export function useMyHoldLedger() {
  return useQuery({
    queryKey: ['my-hold-ledger'],
    queryFn: async (): Promise<HoldLedgerEntry[]> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return [];
      const { data: emp } = await supabase.from('employees').select('id').eq('user_id', uid).maybeSingle();
      if (!emp?.id) return [];
      const { data, error } = await supabase
        .from('company_hold_ledger')
        .select('*')
        .eq('employee_id', emp.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HoldLedgerEntry[];
    },
  });
}

export function useReleaseHold() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  return useMutation({
    mutationFn: async (input: { employee_id: string; amount: number; notes?: string; month_start?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from('company_hold_ledger').insert({
        employee_id: input.employee_id,
        store_id: storeId,
        entry_type: 'RELEASE',
        amount: input.amount,
        notes: input.notes || null,
        month_start: input.month_start || null,
        created_by: userRes.user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-hold-summary'] });
      queryClient.invalidateQueries({ queryKey: ['company-hold-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['my-hold-ledger'] });
      toast.success('Release recorded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteHoldEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_hold_ledger').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-hold-summary'] });
      queryClient.invalidateQueries({ queryKey: ['company-hold-ledger'] });
      toast.success('Entry deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
