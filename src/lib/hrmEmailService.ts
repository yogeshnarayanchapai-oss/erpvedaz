import { supabase } from '@/integrations/supabase/client';

export type HRMEmailType = 
  | 'LEAVE_REQUEST'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'PAYROLL_CREATED'
  | 'PAYROLL_PAID'
  | 'LEAVE_QUOTA_UPDATED'
  | 'ATTENDANCE_CHECKIN'
  | 'ASSET_ASSIGNED';

interface SendHRMEmailParams {
  type: HRMEmailType;
  to: string[];
  employeeName: string;
  details: Record<string, any>;
  companyName?: string;
  linkUrl?: string;
}

/**
 * Send HRM email notification via edge function
 */
export async function sendHRMEmail(params: SendHRMEmailParams): Promise<boolean> {
  try {
    // Filter out any empty or invalid emails
    const validEmails = params.to.filter(email => email && email.includes('@'));
    
    if (validEmails.length === 0) {
      console.warn('No valid email addresses provided for HRM email');
      return false;
    }

    const { data, error } = await supabase.functions.invoke('send-hrm-email', {
      body: {
        ...params,
        to: validEmails,
      },
    });

    if (error) {
      console.error('Error sending HRM email:', error);
      return false;
    }

    console.log('HRM email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to send HRM email:', error);
    return false;
  }
}

/**
 * Get user email by user ID
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();
  return data?.email || null;
}

/**
 * Get emails of admin team (ADMIN, MANAGER, HR, OWNER) for a store
 */
export async function getAdminTeamEmails(storeId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_store_access')
    .select(`
      user_id,
      profiles:user_id (email)
    `)
    .eq('store_id', storeId)
    .eq('is_active', true)
    .in('store_role', ['ADMIN', 'MANAGER', 'HR', 'OWNER']);

  if (!data) return [];

  return data
    .map((u: any) => u.profiles?.email)
    .filter((email: string | null): email is string => !!email && email.includes('@'));
}

/**
 * Get employee email by employee ID
 */
export async function getEmployeeEmail(employeeId: string): Promise<string | null> {
  const { data } = await supabase
    .from('employees')
    .select('user_id, profiles:user_id (email)')
    .eq('id', employeeId)
    .single();
  
  return (data?.profiles as any)?.email || null;
}

/**
 * Get employee name by employee ID
 */
export async function getEmployeeName(employeeId: string): Promise<string> {
  const { data } = await supabase
    .from('employees')
    .select('full_name')
    .eq('id', employeeId)
    .single();
  return data?.full_name || 'Employee';
}
