import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  branch: string | null;
  account_name: string;
  account_number: string;
  is_default: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department_id: string | null;
  joining_date: string | null;
  status: 'Active' | 'Inactive';
  base_salary: number | null;
  bank_account_id: string | null;
  notes: string | null;
  created_at: string;
  departments?: { name: string } | null;
  hr_bank_accounts?: { bank_name: string; account_number: string } | null;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  allowances: number | null;
  deductions: number | null;
  net_salary: number;
  payment_status: 'Pending' | 'Paid';
  paid_on: string | null;
  notes: string | null;
  created_at: string;
  employees?: { full_name: string } | null;
}

export interface HRPolicy {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeHoliday {
  id: string;
  date: string;
  title: string;
  description: string | null;
  holiday_type: 'Public' | 'Company' | 'Event';
  is_office_closed: boolean;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  default_days_per_year: number;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  total_days: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reason: string | null;
  approved_by: string | null;
  created_at: string;
  employees?: { full_name: string } | null;
  leave_types?: { name: string } | null;
}

export interface Notice {
  id: string;
  title: string;
  message: string | null;
  target_audience: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CompanyInfo {
  id: string;
  company_name: string;
  registration_no: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  other_details: string | null;
  updated_at: string;
}

// Departments
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase.from('departments').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Bank Accounts
export function useBankAccounts() {
  return useQuery({
    queryKey: ['hr_bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_bank_accounts').select('*').order('bank_name');
      if (error) throw error;
      return data as BankAccount[];
    },
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<BankAccount, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('hr_bank_accounts').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_bank_accounts'] });
      toast.success('Bank account added');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { data, error } = await supabase.from('hr_bank_accounts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_bank_accounts'] });
      toast.success('Bank account updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_bank_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_bank_accounts'] });
      toast.success('Bank account deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Employees
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`*, departments:department_id(name), hr_bank_accounts:bank_account_id(bank_name, account_number), profiles:user_id(id, name, email)`)
        .order('full_name');
      if (error) throw error;
      return data as (Employee & { profiles?: { id: string; name: string; email: string } | null })[];
    },
  });
}

// Check if user already has an employee record
export function useUserEmployeeLink(userId: string | null) {
  return useQuery({
    queryKey: ['user_employee_link', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'departments' | 'hr_bank_accounts'>) => {
      const { data, error } = await supabase.from('employees').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Payroll
export function usePayrollRecords(month?: string) {
  return useQuery({
    queryKey: ['payroll_records', month],
    queryFn: async () => {
      let query = supabase
        .from('payroll_records')
        .select(`*, employees:employee_id(full_name)`)
        .order('month', { ascending: false });
      if (month) query = query.eq('month', month);
      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollRecord[];
    },
  });
}

export function useCreatePayrollRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { employee_id: string; month: string; basic_salary: number; allowances?: number; deductions?: number; notes?: string }) => {
      const { data, error } = await supabase.from('payroll_records').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
      toast.success('Payroll record created');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdatePayrollRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; allowances?: number; deductions?: number; payment_status?: string; paid_on?: string; notes?: string }) => {
      const { data, error } = await supabase.from('payroll_records').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
      toast.success('Payroll updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useGenerateMonthlyPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) => {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, base_salary')
        .eq('status', 'Active');
      if (empError) throw empError;

      const { data: existing } = await supabase
        .from('payroll_records')
        .select('employee_id')
        .eq('month', month);
      
      const existingIds = new Set(existing?.map(e => e.employee_id) || []);
      const newRecords = employees
        ?.filter(e => !existingIds.has(e.id) && e.base_salary)
        .map(e => ({
          employee_id: e.id,
          month,
          basic_salary: e.base_salary || 0,
        })) || [];

      if (newRecords.length === 0) {
        toast.info('No new payroll records to generate');
        return [];
      }

      const { data, error } = await supabase.from('payroll_records').insert(newRecords).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
      toast.success(`Generated ${data.length} payroll records`);
    },
    onError: (e) => toast.error(e.message),
  });
}

// HR Policies
export function useHRPolicies() {
  return useQuery({
    queryKey: ['hr_policies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_policies').select('*').order('title');
      if (error) throw error;
      return data as HRPolicy[];
    },
  });
}

export function useCreateHRPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; category?: string; content?: string; is_active?: boolean }) => {
      const { data, error } = await supabase.from('hr_policies').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_policies'] });
      toast.success('Policy created');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateHRPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; category?: string; content?: string; is_active?: boolean }) => {
      const { data, error } = await supabase.from('hr_policies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_policies'] });
      toast.success('Policy updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteHRPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_policies'] });
      toast.success('Policy deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Office Holidays
export function useOfficeHolidays() {
  return useQuery({
    queryKey: ['office_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('office_holidays').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as OfficeHoliday[];
    },
  });
}

export function useCreateOfficeHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<OfficeHoliday, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('office_holidays').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office_holidays'] });
      toast.success('Holiday added');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateOfficeHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OfficeHoliday> & { id: string }) => {
      const { data, error } = await supabase.from('office_holidays').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office_holidays'] });
      toast.success('Holiday updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteOfficeHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('office_holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office_holidays'] });
      toast.success('Holiday deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Leave Types
export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_types').select('*').order('name');
      if (error) throw error;
      return data as LeaveType[];
    },
  });
}

// Leave Requests
export function useLeaveRequests(filters?: { status?: string; employeeId?: string }) {
  return useQuery({
    queryKey: ['leave_requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`*, employees:employees!leave_requests_employee_id_fkey(full_name), leave_types:leave_type_id(name)`)
        .order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { employee_id: string; leave_type_id: string; from_date: string; to_date: string; total_days: number; reason?: string }) => {
      const { data, error } = await supabase.from('leave_requests').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      toast.success('Leave request submitted');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; approved_by?: string }) => {
      const { data, error } = await supabase.from('leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      toast.success('Leave request updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Notices
export function useNotices() {
  return useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notices').select('*').order('start_date', { ascending: false });
      if (error) throw error;
      return data as Notice[];
    },
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Notice, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('notices').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice created');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Notice> & { id: string }) => {
      const { data, error } = await supabase.from('notices').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Company Info
export function useCompanyInfo() {
  return useQuery({
    queryKey: ['company_info'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_info').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as CompanyInfo | null;
    },
  });
}

export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<CompanyInfo>) => {
      const { data: existing } = await supabase.from('company_info').select('id').limit(1).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from('company_info').update(updates).eq('id', existing.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('company_info').insert({ company_name: 'Company', ...updates }).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_info'] });
      toast.success('Company info updated');
    },
    onError: (e) => toast.error(e.message),
  });
}
