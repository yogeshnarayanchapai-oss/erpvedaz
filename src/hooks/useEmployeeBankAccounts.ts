import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployeeBankAccount {
  id: string;
  bank_name: string;
  branch: string | null;
  account_name: string | null;
  account_number: string;
  is_default: boolean;
  employee_id: string | null;
  store_id: string | null;
  created_at: string;
}

// Fetch bank accounts for an employee
export function useEmployeeBankAccounts(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-bank-accounts', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('hr_bank_accounts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeBankAccount[];
    },
    enabled: !!employeeId,
  });
}

// Fetch current user's bank accounts
export function useMyBankAccounts() {
  return useQuery({
    queryKey: ['my-bank-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // First get employee id
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!employee) return [];

      const { data, error } = await supabase
        .from('hr_bank_accounts')
        .select('*')
        .eq('employee_id', employee.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeBankAccount[];
    },
  });
}

// Add a new bank account
export function useAddBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bank_name: string;
      branch?: string;
      account_name?: string;
      account_number: string;
      is_default?: boolean;
      employee_id: string;
      store_id?: string;
    }) => {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('hr_bank_accounts')
          .update({ is_default: false })
          .eq('employee_id', data.employee_id);
      }

      const { data: result, error } = await supabase
        .from('hr_bank_accounts')
        .insert({
          bank_name: data.bank_name,
          branch: data.branch || null,
          account_name: data.account_name || null,
          account_number: data.account_number,
          is_default: data.is_default || false,
          employee_id: data.employee_id,
          store_id: data.store_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success('Bank account added successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-bank-accounts', variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add bank account');
    },
  });
}

// Update a bank account
export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      bank_name?: string;
      branch?: string;
      account_name?: string;
      account_number?: string;
      is_default?: boolean;
      employee_id: string;
    }) => {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('hr_bank_accounts')
          .update({ is_default: false })
          .eq('employee_id', data.employee_id)
          .neq('id', data.id);
      }

      const { id, employee_id, ...updates } = data;
      const { data: result, error } = await supabase
        .from('hr_bank_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success('Bank account updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-bank-accounts', variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update bank account');
    },
  });
}

// Delete a bank account
export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; employee_id: string }) => {
      const { error } = await supabase
        .from('hr_bank_accounts')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Bank account deleted');
      queryClient.invalidateQueries({ queryKey: ['employee-bank-accounts', variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete bank account');
    },
  });
}
