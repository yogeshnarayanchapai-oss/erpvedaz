import { supabase } from '@/integrations/supabase/client';

// HRM-specific notification types
export type HRMNotificationType = 
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_DELETED'
  | 'LEAVE_REQUEST'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'ATTENDANCE_CHECKIN'
  | 'ATTENDANCE_CHECKOUT'
  | 'PAYROLL_CREATED'
  | 'PAYROLL_PAID'
  | 'LEAVE_QUOTA_UPDATED'
  | 'ASSET_ASSIGNED'
  | 'ASSET_RETURNED'
  | 'NOTICE_PUBLISHED'
  | 'POLICY_UPDATED'
  | 'HOLIDAY_ADDED';

export interface HRMNotificationParams {
  type: HRMNotificationType;
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  targetUserId?: string; // Specific user (for staff notifications)
  targetRoles?: string[]; // Admin/Manager/HR roles
  storeId?: string;
  linkPath?: string;
  entityType?: string; // 'leave_request', 'document', 'attendance', etc.
  entityId?: string;
  meta?: Record<string, any>;
}

/**
 * Send notifications to admin team (ADMIN, MANAGER, HR, OWNER)
 */
export async function notifyAdminTeam(params: Omit<HRMNotificationParams, 'targetUserId'>) {
  const { storeId, targetRoles = ['ADMIN', 'MANAGER', 'HR', 'OWNER'], ...rest } = params;
  
  if (!storeId) return;

  try {
    // Get users with admin roles in this store
    const { data: storeUsers } = await supabase
      .from('user_store_access')
      .select('user_id, store_role')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .in('store_role', targetRoles as any);

    if (!storeUsers || storeUsers.length === 0) return;

    const notifications = storeUsers.map(u => ({
      target_user_id: u.user_id,
      type: rest.type,
      title: rest.title,
      message: rest.message,
      actor_id: rest.actorId,
      actor_name: rest.actorName,
      link_path: rest.linkPath,
      store_id: storeId,
      portal: 'HRM',
      meta: {
        entity_type: rest.entityType,
        entity_id: rest.entityId,
        ...rest.meta,
      },
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Failed to notify admin team:', error);
  }
}

/**
 * Send notification to a specific staff member
 */
export async function notifyStaff(params: HRMNotificationParams) {
  const { targetUserId, storeId, ...rest } = params;
  
  if (!targetUserId) return;

  try {
    await supabase.from('notifications').insert({
      target_user_id: targetUserId,
      type: rest.type,
      title: rest.title,
      message: rest.message,
      actor_id: rest.actorId,
      actor_name: rest.actorName,
      link_path: rest.linkPath,
      store_id: storeId || null,
      portal: 'HRM',
      meta: {
        entity_type: rest.entityType,
        entity_id: rest.entityId,
        ...rest.meta,
      },
    });
  } catch (error) {
    console.error('Failed to notify staff:', error);
  }
}

/**
 * Send notification to multiple specific users
 */
export async function notifyUsers(userIds: string[], params: Omit<HRMNotificationParams, 'targetUserId'>) {
  if (!userIds || userIds.length === 0) return;

  try {
    const notifications = userIds.map(userId => ({
      target_user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actor_id: params.actorId,
      actor_name: params.actorName,
      link_path: params.linkPath,
      store_id: params.storeId || null,
      portal: 'HRM',
      meta: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        ...params.meta,
      },
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Failed to notify users:', error);
  }
}

/**
 * Get employee's user_id by employee_id
 */
export async function getEmployeeUserId(employeeId: string): Promise<string | null> {
  const { data } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single();
  return data?.user_id || null;
}

/**
 * Get employee details by employee_id
 */
export async function getEmployeeDetails(employeeId: string) {
  const { data } = await supabase
    .from('employees')
    .select('id, user_id, full_name, store_id')
    .eq('id', employeeId)
    .single();
  return data;
}

/**
 * Get current user's profile name
 */
export async function getCurrentUserName(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'System';
  
  const { data } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();
  return data?.name || 'Unknown User';
}
