import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyLeadTransfer, notifyLeadStatusChange, notifyLeadReturnedToCNR } from '@/lib/notificationHelpers';

type LeadStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'CONFIRMED' | 'FOLLOW_UP' | 'CALL_NOT_RECEIVED' | 'CANCELLED' | 'REDIRECT';
type TeamType = 'LEADS' | 'CALLING' | 'FOLLOWUP';
type LeadBucket = 'NEW' | 'FOLLOWUP' | 'CANCELLED' | 'FOLLOW_UP_POOL' | 'CNR_POOL';
type PoolStatus = 'IN_POOL' | 'ASSIGNED';

export interface Lead {
  id: string;
  created_at: string;
  date: string;
  client_name: string;
  contact_number: string;
  alt_phone: string | null;
  product_id: string | null;
  destination_branch: string | null;
  branch_id: string | null;
  full_address: string | null;
  od_vd: string | null;
  status: LeadStatus;
  remark: string | null;
  order_description: string | null;
  source: string | null;
  current_team: TeamType;
  assigned_to_user_id: string | null;
  created_by_user_id: string | null;
  created_by_staff_id: string | null;
  order_id: string | null;
  tag: string | null;
  lead_bucket: LeadBucket | null;
  pool_status: PoolStatus | null;
  returned_to_leads_at: string | null;
  assigned_at: string | null;
  last_called_by: string | null;
  last_called_at: string | null;
  last_transfer_reason: string | null;
  // Follow-up related fields
  next_followup_at: string | null;
  followup_reason: string | null;
  is_followup_reminded: boolean | null;
  followup_completed: boolean | null;
  // Transfer tracking
  is_transferred: boolean;
  products?: { name: string } | null;
  assigned_to?: { name: string } | null;
  created_by_staff?: { name: string } | null;
  branches?: { branch_name: string; district: string | null; arrival_time: string | null; contact_phone: string | null; base_charge: number | null; area_covered: string | null } | null;
}

export interface CreateLeadInput {
  client_name: string;
  contact_number: string;
  product_id?: string;
  destination_branch?: string;
  full_address?: string;
  remark?: string;
  source?: string;
  date?: string;
}

export interface UpdateLeadInput {
  leadId: string;
  destination_branch?: string;
  branch_id?: string;
  full_address?: string;
  alt_phone?: string;
  remark?: string;
  status?: LeadStatus;
  order_description?: string;
  // Follow-up fields
  next_followup_at?: string;
  followup_reason?: string;
  is_followup_reminded?: boolean;
  followup_completed?: boolean;
}

export function useLeads(filters?: {
  status?: LeadStatus;
  team?: TeamType;
  assignedTo?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  leadBucket?: LeadBucket;
}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          products:product_id(name),
          assigned_to:profiles!leads_assigned_to_user_id_fkey(name),
          created_by_staff:profiles!leads_created_by_staff_id_fkey(name),
          branches:branch_id(branch_name, district, arrival_time, contact_phone, base_charge, area_covered)
        `)
        // Exclude confirmed leads - they appear in Orders only
        .neq('status', 'CONFIRMED')
        .is('order_id', null)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.team) {
        query = query.eq('current_team', filters.team);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to_user_id', filters.assignedTo);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }
      if (filters?.leadBucket) {
        query = query.eq('lead_bucket', filters.leadBucket);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...input,
          date: input.date || new Date().toISOString().split('T')[0],
          created_by_user_id: user.id,
          status: 'NEW',
          current_team: 'LEADS',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create lead: ${error.message}`);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLeadInput) => {
      const { leadId, ...updates } = input;
      
      // Filter out undefined values
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      const { data, error } = await supabase
        .from('leads')
        .update(filteredUpdates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      status, 
      remark 
    }: { 
      leadId: string; 
      status: LeadStatus;
      remark?: string;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status, remark })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
}

export function useTransferLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      staffId,
      count,
      leadBucket = 'NEW',
    }: {
      productId: string;
      staffId: string;
      count: number;
      leadBucket?: 'NEW' | 'FOLLOW_UP_POOL' | 'CNR_POOL';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch staff name and product name for notification
      const [staffResult, productResult, actorResult] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', staffId).single(),
        supabase.from('products').select('name').eq('id', productId).single(),
        supabase.from('profiles').select('name').eq('id', user.id).single(),
      ]);

      const staffName = staffResult.data?.name || 'Unknown';
      const productName = productResult.data?.name || 'Unknown';
      const actorName = actorResult.data?.name || 'Admin';

      // Get leads for the product filtered by bucket and pool status
      // Exclude confirmed leads - they cannot be transferred
      let query = supabase
        .from('leads')
        .select('id')
        .eq('product_id', productId)
        .eq('current_team', 'LEADS')
        .eq('pool_status', 'IN_POOL')
        .is('assigned_to_user_id', null)
        .neq('status', 'CONFIRMED')
        .is('order_id', null)
        .order('created_at', { ascending: true })
        .limit(count);
      
      // Filter by lead_bucket
      query = query.eq('lead_bucket', leadBucket);

      const { data: leads, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) {
        const bucketLabel = leadBucket === 'NEW' ? 'new' : leadBucket === 'FOLLOW_UP_POOL' ? 'follow-up' : 'CNR';
        throw new Error(`No ${bucketLabel} leads available for transfer`);
      }

      const leadIds = leads.map(l => l.id);

      // Update leads
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: staffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
          pool_status: 'ASSIGNED',
          assigned_at: new Date().toISOString(),
          is_transferred: true,
        })
        .in('id', leadIds);

      if (updateError) throw updateError;

      // Create transfer records
      const transfers = leadIds.map(leadId => ({
        lead_id: leadId,
        from_team: 'LEADS' as const,
        to_team: 'CALLING' as const,
        to_user_id: staffId,
        transferred_by_user_id: user.id,
      }));

      const { error: transferError } = await supabase
        .from('lead_transfers')
        .insert(transfers);

      if (transferError) throw transferError;

      // Send notification
      try {
        await notifyLeadTransfer({
          count: leadIds.length,
          productName,
          targetUserId: staffId,
          targetUserName: staffName,
          actorId: user.id,
          actorName,
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      return { transferred: leadIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.transferred} leads transferred successfully`);
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });
}

export function useTransferToFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current lead to capture assigned_to_user_id and verify ownership
      const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('assigned_to_user_id, current_team')
        .eq('id', leadId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!lead) throw new Error('Lead not found');

      // Verify the lead is assigned to the current user (required by RLS policy)
      if (lead.assigned_to_user_id !== user.id) {
        throw new Error('You can only transfer leads assigned to you');
      }

      // Update lead to followup team with TRF tag
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          current_team: 'FOLLOWUP',
          assigned_to_user_id: null,
          tag: 'TRF',
        })
        .eq('id', leadId)
        .eq('assigned_to_user_id', user.id); // Extra safety: only update if still assigned to user

      if (updateError) throw updateError;

      // Create transfer record with from_user_id
      const { error: transferError } = await supabase
        .from('lead_transfers')
        .insert({
          lead_id: leadId,
          from_team: 'CALLING',
          to_team: 'FOLLOWUP',
          from_user_id: lead?.assigned_to_user_id || user.id,
          transferred_by_user_id: user.id,
        });

      if (transferError) throw transferError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead transferred to Follow-up team');
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });
}

export type TransferReason = 'FOLLOWUP' | 'CNR' | 'CANCELLED';

export function useReturnLeadsToQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all selected leads - include assigned_to_user_id filter to satisfy RLS policy
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'NEW',
          lead_bucket: 'NEW',
          assigned_to_user_id: null,
          current_team: 'LEADS',
        })
        .in('id', leadIds)
        .eq('assigned_to_user_id', user.id); // Ensure leads are assigned to current user

      if (updateError) throw updateError;

      // Create transfer records for audit
      const transfers = leadIds.map(leadId => ({
        lead_id: leadId,
        from_team: 'CALLING' as const,
        to_team: 'LEADS' as const,
        transferred_by_user_id: user.id,
      }));

      await supabase.from('lead_transfers').insert(transfers);

      return { count: leadIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.count} lead${data.count > 1 ? 's were' : ' was'} sent back to the Leads queue`);
    },
    onError: (error) => {
      toast.error(`Failed to return leads: ${error.message}`);
    },
  });
}

// Quick action to mark lead as CNR and auto-move to CNR bucket
export function useMarkAsCNR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      notes 
    }: { 
      leadId: string; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user role
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .maybeSingle();

      const isAdminOrManager = userProfile?.role === 'ADMIN' || userProfile?.role === 'MANAGER' || userProfile?.role === 'OWNER';

      // Get lead details for notification and verification
      const { data: lead } = await supabase
        .from('leads')
        .select('client_name, contact_number, product_id, assigned_to_user_id, products:product_id(name)')
        .eq('id', leadId)
        .maybeSingle();

      if (!lead) throw new Error('Lead not found');

      // Verify permission: must be assigned to this lead OR be admin/manager
      if (!isAdminOrManager && lead.assigned_to_user_id !== user.id) {
        throw new Error('You can only mark leads assigned to you as CNR');
      }

      // Update lead to CNR status and move to LEADS team for redistribution
      const { error: updateError, count } = await supabase
        .from('leads')
        .update({
          status: 'CALL_NOT_RECEIVED',
          lead_bucket: 'CNR_POOL',
          pool_status: 'IN_POOL',
          assigned_to_user_id: null,
          current_team: 'LEADS',
          last_called_by: user.id,
          last_called_at: new Date().toISOString(),
          last_transfer_reason: 'CNR',
          returned_to_leads_at: new Date().toISOString(),
          remark: notes || 'Call Not Received',
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Create transfer record
      const { error: transferError } = await supabase
        .from('lead_transfers')
        .insert({
          lead_id: leadId,
          from_team: 'CALLING',
          to_team: 'LEADS',
          from_user_id: user.id,
          transferred_by_user_id: user.id,
        });

      if (transferError) throw transferError;

      // Send notification to LEADS role
      if (lead) {
        try {
          await notifyLeadReturnedToCNR({
            leadId,
            customerName: lead.client_name || 'Unknown',
            phone: lead.contact_number || '',
            productName: (lead.products as any)?.name,
            actorId: user.id,
            actorName: userProfile?.name || 'Staff',
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead marked as CNR and moved to queue for redistribution');
    },
    onError: (error) => {
      toast.error(`Failed to mark as CNR: ${error.message}`);
    },
  });
}

export function useTransferToLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      reason, 
      notes 
    }: { 
      leadId: string; 
      reason: TransferReason;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user role
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .maybeSingle();

      const isAdminOrManager = userProfile?.role === 'ADMIN' || userProfile?.role === 'MANAGER' || userProfile?.role === 'OWNER';

      // Get lead details to verify ownership
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to_user_id')
        .eq('id', leadId)
        .maybeSingle();

      if (!lead) throw new Error('Lead not found');

      // Verify permission: must be assigned to this lead OR be admin/manager
      if (!isAdminOrManager && lead.assigned_to_user_id !== user.id) {
        throw new Error('You can only transfer leads assigned to you');
      }

      // Determine status and bucket based on reason
      let status: LeadStatus;
      let leadBucket: LeadBucket;
      
      switch (reason) {
        case 'FOLLOWUP':
          status = 'FOLLOW_UP';
          leadBucket = 'FOLLOW_UP_POOL';
          break;
        case 'CNR':
          status = 'CALL_NOT_RECEIVED';
          leadBucket = 'CNR_POOL';
          break;
        case 'CANCELLED':
          status = 'CANCELLED';
          leadBucket = 'CANCELLED';
          break;
      }

      // Update lead
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status,
          lead_bucket: leadBucket,
          pool_status: reason === 'CANCELLED' ? 'ASSIGNED' : 'IN_POOL',
          assigned_to_user_id: null,
          current_team: 'LEADS',
          last_called_by: user.id,
          last_called_at: new Date().toISOString(),
          last_transfer_reason: reason,
          returned_to_leads_at: reason !== 'CANCELLED' ? new Date().toISOString() : undefined,
          remark: notes || undefined,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Create transfer record
      const { error: transferError } = await supabase
        .from('lead_transfers')
        .insert({
          lead_id: leadId,
          from_team: 'CALLING',
          to_team: 'LEADS',
          from_user_id: user.id,
          transferred_by_user_id: user.id,
        });

      if (transferError) throw transferError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead transferred back to Leads');
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });
}

// Admin function to resend CNR leads back to Leads pool
export function useAdminResendCNRToPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all selected CNR leads to be back in CNR pool
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          lead_bucket: 'CNR_POOL',
          pool_status: 'IN_POOL',
          assigned_to_user_id: null,
          current_team: 'LEADS',
          returned_to_leads_at: new Date().toISOString(),
        })
        .in('id', leadIds);

      if (updateError) throw updateError;

      // Create transfer records for audit
      const transfers = leadIds.map(leadId => ({
        lead_id: leadId,
        from_team: 'CALLING' as const,
        to_team: 'LEADS' as const,
        transferred_by_user_id: user.id,
      }));

      await supabase.from('lead_transfers').insert(transfers);

      return { count: leadIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.count} CNR lead${data.count > 1 ? 's' : ''} sent back to Leads pool`);
    },
    onError: (error) => {
      toast.error(`Failed to resend leads: ${error.message}`);
    },
  });
}

// Admin function to resend Follow-up leads back to Leads pool
export function useAdminResendFollowupToPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all selected Follow-up leads to be back in Follow-up pool
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          lead_bucket: 'FOLLOW_UP_POOL',
          pool_status: 'IN_POOL',
          assigned_to_user_id: null,
          current_team: 'LEADS',
          returned_to_leads_at: new Date().toISOString(),
        })
        .in('id', leadIds);

      if (updateError) throw updateError;

      // Create transfer records for audit
      const transfers = leadIds.map(leadId => ({
        lead_id: leadId,
        from_team: 'CALLING' as const,
        to_team: 'LEADS' as const,
        transferred_by_user_id: user.id,
      }));

      await supabase.from('lead_transfers').insert(transfers);

      return { count: leadIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.count} Follow-up lead${data.count > 1 ? 's' : ''} sent back to Leads pool`);
    },
    onError: (error) => {
      toast.error(`Failed to resend leads: ${error.message}`);
    },
  });
}
