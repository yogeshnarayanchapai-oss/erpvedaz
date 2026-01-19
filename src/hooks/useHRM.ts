import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { notifyAdminTeam, notifyStaff, getEmployeeDetails, getCurrentUserName } from '@/lib/hrmNotifications';
import { sendHRMEmail, getAdminTeamEmails, getEmployeeEmail } from '@/lib/hrmEmailService';

// Types
export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  store_id: string | null;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  branch: string | null;
  account_name: string;
  account_number: string;
  is_default: boolean;
  created_at: string;
  store_id: string | null;
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
  store_id: string | null;
  // Office time settings for attendance
  office_start_time: string | null;
  office_end_time: string | null;
  grace_minutes: number | null;
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
  store_id: string | null;
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
  store_id: string | null;
}

export interface OfficeHoliday {
  id: string;
  date: string;
  title: string;
  description: string | null;
  holiday_type: 'Public' | 'Company' | 'Event';
  is_office_closed: boolean;
  created_at: string;
  store_id: string | null;
}

export interface LeaveType {
  id: string;
  name: string;
  default_days_per_year: number;
  created_at: string;
  store_id: string | null;
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
  store_id: string | null;
  employees?: { full_name: string } | null;
  leave_types?: { name: string } | null;
}

export interface Notice {
  id: string;
  title: string;
  message: string | null;
  target_audience: string;
  target_type: 'all' | 'department' | 'employee';
  target_department_ids: string[];
  target_employee_ids: string[];
  show_as_popup: boolean;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  store_id?: string | null;
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['departments', storeId],
    queryFn: async () => {
      let query = supabase.from('departments').select('*').order('name');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Department[];
    },
    enabled: !!storeId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase.from('departments').insert({ ...input, store_id: storeId }).select().single();
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['hr_bank_accounts', storeId],
    queryFn: async () => {
      let query = supabase.from('hr_bank_accounts').select('*').order('bank_name');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!storeId,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: Omit<BankAccount, 'id' | 'created_at' | 'store_id'>) => {
      const { data, error } = await supabase.from('hr_bank_accounts').insert({ ...input, store_id: storeId }).select().single();
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['employees', storeId],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(`*, departments:department_id(name), hr_bank_accounts:bank_account_id(bank_name, account_number), profiles:user_id(id, name, email)`)
        .order('full_name');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as (Employee & { profiles?: { id: string; name: string; email: string } | null })[];
    },
    enabled: !!storeId,
  });
}

export function useUserEmployeeLink(userId: string | null) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['user_employee_link', userId, storeId],
    queryFn: async () => {
      if (!userId) return null;
      let query = supabase
        .from('employees')
        .select('id, full_name')
        .eq('user_id', userId);
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'departments' | 'hr_bank_accounts' | 'store_id'>) => {
      const { data, error } = await supabase.from('employees').insert({ ...input, store_id: storeId }).select().single();
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['payroll_records', month, storeId],
    queryFn: async () => {
      let query = supabase
        .from('payroll_records')
        .select(`*, employees:employee_id(full_name)`)
        .order('month', { ascending: false });
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (month) query = query.eq('month', month);
      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollRecord[];
    },
    enabled: !!storeId,
  });
}

export function useCreatePayrollRecord() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: { employee_id: string; month: string; basic_salary: number; allowances?: number; deductions?: number; notes?: string }) => {
      const { data, error } = await supabase.from('payroll_records').insert({ ...input, store_id: storeId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
      toast.success('Payroll record created');

      // Notify the employee about their payroll record
      try {
        const employee = await getEmployeeDetails(variables.employee_id);
        if (employee?.user_id) {
          const actorName = await getCurrentUserName();
          await notifyStaff({
            type: 'PAYROLL_CREATED',
            title: 'Payroll Record Added',
            message: `Your payroll for ${variables.month} has been created. Basic: NPR ${variables.basic_salary.toLocaleString()}`,
            targetUserId: employee.user_id,
            actorName,
            storeId: storeId || undefined,
            linkPath: '/my-hr/salary-slips',
            entityType: 'payroll',
            entityId: data.id,
          });
        }
      } catch (e) {
        console.error('Failed to send payroll notification:', e);
      }
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdatePayrollRecord() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; allowances?: number; deductions?: number; payment_status?: string; paid_on?: string; notes?: string }) => {
      const { data, error } = await supabase.from('payroll_records').update(updates).eq('id', id).select('*, employees:employee_id(full_name, user_id)').single();
      if (error) throw error;
      return { data, updates };
    },
    onSuccess: async ({ data, updates }) => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
      toast.success('Payroll updated');

      // Notify employee when payroll is marked as paid
      if (updates.payment_status === 'Paid') {
        try {
          const employee = (data as any).employees;
          if (employee?.user_id) {
            const actorName = await getCurrentUserName();
            await notifyStaff({
              type: 'PAYROLL_PAID',
              title: 'Salary Paid',
              message: `Your salary for ${data.month} has been marked as paid`,
              targetUserId: employee.user_id,
              actorName,
              storeId: storeId || undefined,
              linkPath: '/my-hr/salary-slips',
              entityType: 'payroll',
              entityId: data.id,
            });
          }
        } catch (e) {
          console.error('Failed to send payroll paid notification:', e);
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeletePayrollRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payroll_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records'] });
      toast.success('Payroll record deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useGenerateMonthlyPayroll() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (month: string) => {
      let empQuery = supabase
        .from('employees')
        .select('id, base_salary')
        .eq('status', 'Active');
      if (storeId) {
        empQuery = empQuery.eq('store_id', storeId);
      }
      const { data: employees, error: empError } = await empQuery;
      if (empError) throw empError;

      let existQuery = supabase
        .from('payroll_records')
        .select('employee_id')
        .eq('month', month);
      if (storeId) {
        existQuery = existQuery.eq('store_id', storeId);
      }
      const { data: existing } = await existQuery;
      
      const existingIds = new Set(existing?.map(e => e.employee_id) || []);
      const newRecords = employees
        ?.filter(e => !existingIds.has(e.id) && e.base_salary)
        .map(e => ({
          employee_id: e.id,
          month,
          basic_salary: e.base_salary || 0,
          store_id: storeId,
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['hr_policies', storeId],
    queryFn: async () => {
      let query = supabase.from('hr_policies').select('*').order('title');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as HRPolicy[];
    },
    enabled: !!storeId,
  });
}

export function useCreateHRPolicy() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: { title: string; category?: string; content?: string; is_active?: boolean }) => {
      const { data, error } = await supabase.from('hr_policies').insert({ ...input, store_id: storeId }).select().single();
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['office_holidays', storeId],
    queryFn: async () => {
      let query = supabase.from('office_holidays').select('*').order('date', { ascending: false });
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as OfficeHoliday[];
    },
    enabled: !!storeId,
  });
}

export function useCreateOfficeHoliday() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: Omit<OfficeHoliday, 'id' | 'created_at' | 'store_id'>) => {
      const { data, error } = await supabase.from('office_holidays').insert({ ...input, store_id: storeId }).select().single();
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
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['leave_types', storeId],
    queryFn: async () => {
      // Fetch store-specific leave types AND shared/global leave types (store_id IS NULL)
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .or(`store_id.eq.${storeId},store_id.is.null`)
        .order('name');
      if (error) throw error;
      return data as LeaveType[];
    },
    enabled: !!storeId,
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: { name: string; default_days_per_year: number }) => {
      const { data, error } = await supabase.from('leave_types').insert({ ...input, store_id: storeId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_types'] });
      toast.success('Leave type created');
    },
    onError: (e: any) => {
      // Handle duplicate name error with friendly message
      if (e.code === '23505' || e.message?.includes('duplicate key') || e.message?.includes('unique constraint')) {
        toast.error('Leave type with this name already exists in this store');
      } else {
        toast.error(e.message);
      }
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; default_days_per_year?: number }) => {
      const { data, error } = await supabase.from('leave_types').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_types'] });
      toast.success('Leave type updated');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leave_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_types'] });
      toast.success('Leave type deleted');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useSeedDefaultLeaveTypes() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async () => {
      const defaultTypes = [
        { name: 'Sick Leave', default_days_per_year: 12, store_id: storeId },
        { name: 'Casual Leave', default_days_per_year: 12, store_id: storeId },
        { name: 'Unpaid Leave', default_days_per_year: 0, store_id: storeId },
        { name: 'Others', default_days_per_year: 0, store_id: storeId },
      ];
      const { error } = await supabase.from('leave_types').insert(defaultTypes);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_types'] });
      toast.success('Default leave types added');
    },
    onError: (e) => toast.error(e.message),
  });
}

// Leave Requests
export function useLeaveRequests(filters?: { status?: string; employeeId?: string }) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['leave_requests', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`*, employees:employees!leave_requests_employee_id_fkey(full_name), leave_types:leave_type_id(name)`)
        .order('created_at', { ascending: false });
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!storeId,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: { employee_id: string; leave_type_id: string; from_date: string; to_date: string; total_days: number; reason?: string }) => {
      const { data, error } = await supabase.from('leave_requests').insert({ ...input, store_id: storeId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      toast.success('Leave request submitted');

      // Notify ADMIN, MANAGER, HR users about the leave request
      try {
        // Fetch employee and leave type info
        const [employeeRes, leaveTypeRes] = await Promise.all([
          supabase.from('employees').select('full_name, user_id').eq('id', data.employee_id).single(),
          supabase.from('leave_types').select('name').eq('id', data.leave_type_id).single()
        ]);
        
        const employeeName = employeeRes.data?.full_name || 'An employee';
        const leaveTypeName = leaveTypeRes.data?.name || 'Leave';
        
        // Get users with ADMIN, MANAGER, or HR roles in this store
        const { data: storeUsers } = await supabase
          .from('user_store_access')
          .select('user_id, store_role, profiles:user_id(role)')
          .eq('store_id', storeId)
          .eq('is_active', true);

        // Filter users who have admin roles (either in store_role or in profiles.role)
        const adminRoles = ['ADMIN', 'MANAGER', 'HR', 'OWNER'];
        const adminUsers = storeUsers?.filter(u => {
          const storeRole = u.store_role;
          const profileRole = (u.profiles as any)?.role;
          return adminRoles.includes(storeRole as string) || adminRoles.includes(profileRole as string);
        }) || [];

        if (adminUsers.length > 0) {
          const notifications = adminUsers.map(u => ({
            target_user_id: u.user_id,
            title: 'New Leave Request',
            message: `${employeeName} requested ${leaveTypeName} (${data.total_days} days) from ${data.from_date} to ${data.to_date}`,
            type: 'LEAVE_REQUEST',
            store_id: storeId,
            actor_id: employeeRes.data?.user_id,
            actor_name: employeeName,
          }));

          await supabase.from('notifications').insert(notifications);

          // Send email notifications to admin team
          if (storeId) {
            const adminEmails = await getAdminTeamEmails(storeId);
            if (adminEmails.length > 0) {
              await sendHRMEmail({
                type: 'LEAVE_REQUEST',
                to: adminEmails,
                employeeName,
                details: {
                  leaveType: leaveTypeName,
                  startDate: data.from_date,
                  endDate: data.to_date,
                  days: data.total_days,
                  reason: data.reason,
                },
                linkUrl: `${window.location.origin}/hrm/leave`,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to send leave request notifications:', e);
      }
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; approved_by?: string }) => {
      const { data, error } = await supabase.from('leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      queryClient.invalidateQueries({ queryKey: ['leave_quotas'] });
      toast.success('Leave request updated');

      // Send notification to the employee when leave is approved/rejected
      if (variables.status === 'Approved' || variables.status === 'Rejected') {
        try {
          // Fetch employee info
          const { data: employee } = await supabase
            .from('employees')
            .select('full_name, user_id')
            .eq('id', data.employee_id)
            .single();

          if (employee?.user_id) {
            const notification = {
              target_user_id: employee.user_id,
              title: `Leave ${variables.status}`,
              message: `Your leave request from ${data.from_date} to ${data.to_date} (${data.total_days} days) has been ${variables.status.toLowerCase()}.`,
              type: 'LEAVE_STATUS',
              store_id: storeId,
            };

            await supabase.from('notifications').insert(notification);

            // Send email notification
            const employeeEmail = await getEmployeeEmail(data.employee_id);
            if (employeeEmail) {
              const { data: leaveType } = await supabase
                .from('leave_types')
                .select('name')
                .eq('id', data.leave_type_id)
                .single();

              const emailType = variables.status === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED';
              await sendHRMEmail({
                type: emailType,
                to: [employeeEmail],
                employeeName: employee.full_name,
                details: {
                  leaveType: leaveType?.name || 'Leave',
                  startDate: data.from_date,
                  endDate: data.to_date,
                  days: data.total_days,
                  approvedBy: 'Admin',
                  rejectionReason: variables.status === 'Rejected' ? 'Please contact your manager for details' : undefined,
                },
                linkUrl: `${window.location.origin}/myhr/leave`,
              });
            }
          }

          // Auto-deduct leave quota when leave is approved
          if (variables.status === 'Approved') {
            // Find the leave quota for this employee and leave type
            const { data: quotaRecord } = await supabase
              .from('leave_quota')
              .select('*')
              .eq('employee_id', data.employee_id)
              .eq('leave_type_id', data.leave_type_id)
              .single();

            if (quotaRecord) {
              const newUsedDays = (quotaRecord.used_days || 0) + data.total_days;
              await supabase
                .from('leave_quota')
                .update({ used_days: newUsedDays })
                .eq('id', quotaRecord.id);
            }
          }
        } catch (e) {
          console.error('Failed to send leave status notification or update quota:', e);
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });
}

// Notices
export function useNotices() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['notices', storeId],
    queryFn: async () => {
      let query = supabase.from('notices').select('*').order('start_date', { ascending: false }) as any;
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Notice[];
    },
    enabled: !!storeId,
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: Omit<Notice, 'id' | 'created_at' | 'store_id'>) => {
      const insertData = { ...input, store_id: storeId } as any;
      const { data, error } = await supabase.from('notices').insert(insertData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice created');
    },
    onError: (e: any) => toast.error(e.message),
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
