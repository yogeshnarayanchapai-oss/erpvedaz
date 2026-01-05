import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { subMonths } from 'date-fns';
import { useCurrentStoreId } from './useCurrentStoreId';

// Lead status enum from database
export const LEAD_STATUSES = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'CONFIRMED',
  'FOLLOW_UP',
  'CALL_NOT_RECEIVED',
  'CANCELLED',
  'REDIRECT',
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number];

export interface CleanupFilters {
  cutoffDate: Date;
  status: LeadStatus | 'ALL';
}

// Maximum rows we can safely export in browser
const MAX_EXPORT_ROWS = 50000;
const BATCH_SIZE = 1000;
const DELETE_BATCH_SIZE = 500;

// Minimum cutoff date is 3 months ago
export function getMinCutoffDate(): Date {
  return subMonths(new Date(), 3);
}

export function isValidCutoffDate(date: Date): boolean {
  const minDate = getMinCutoffDate();
  return date <= minDate;
}

export function useLeadCleanupPreview(filters: CleanupFilters | null) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['lead-cleanup-preview', storeId, filters?.cutoffDate?.toISOString(), filters?.status],
    queryFn: async (): Promise<number> => {
      if (!storeId || !filters) return 0;
      
      // Validate cutoff date
      if (!isValidCutoffDate(filters.cutoffDate)) {
        return 0;
      }

      // Use 'date' field (lead date) instead of 'created_at' (row insertion time)
      const cutoffDateStr = filters.cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .lt('date', cutoffDateStr);

      if (filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }

      const { count, error } = await query;
      if (error) throw error;
      
      return count || 0;
    },
    enabled: !!storeId && !!filters && isValidCutoffDate(filters.cutoffDate),
  });
}

export function useExportAndDeleteLeadsFiltered() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (filters: CleanupFilters) => {
      if (!storeId) throw new Error('No store selected');
      
      // Double-check cutoff date validation
      if (!isValidCutoffDate(filters.cutoffDate)) {
        throw new Error('Cannot delete leads newer than 3 months');
      }

      // First, get total count
      // Use 'date' field (lead date) instead of 'created_at'
      const cutoffDateStr = filters.cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      let countQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .lt('date', cutoffDateStr);

      if (filters.status !== 'ALL') {
        countQuery = countQuery.eq('status', filters.status);
      }

      const { count: totalCount, error: countError } = await countQuery;
      if (countError) throw countError;
      if (!totalCount || totalCount === 0) throw new Error('No leads to export');

      if (totalCount > MAX_EXPORT_ROWS) {
        throw new Error(`Too many leads (${totalCount.toLocaleString()}). Maximum is ${MAX_EXPORT_ROWS.toLocaleString()}. Please narrow your filters.`);
      }

      // Fetch all leads with pagination
      const allLeads: any[] = [];
      let from = 0;

      while (from < totalCount) {
        let query = supabase
          .from('leads')
          .select('*')
          .eq('store_id', storeId)
          .lt('date', cutoffDateStr)
          .range(from, from + BATCH_SIZE - 1);

        if (filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allLeads.push(...data);
        from += BATCH_SIZE;
      }

      if (allLeads.length === 0) throw new Error('No leads to export');

      // Export to Excel
      const exportData = allLeads.map(lead => ({
        'Name': lead.client_name || '',
        'Phone': lead.contact_number || '',
        'Alt Phone': lead.alt_phone || '',
        'Address': lead.full_address || '',
        'Branch': lead.destination_branch || '',
        'Product ID': lead.product_id || '',
        'Status': lead.status || '',
        'Source': lead.source || '',
        'Remark': lead.remark || '',
        'Tag': lead.tag || '',
        'Created At': lead.created_at ? new Date(lead.created_at).toLocaleString() : '',
        'Order ID': lead.order_id || '',
        'Reference ID': lead.reference_id || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
      
      const statusLabel = filters.status === 'ALL' ? 'AllStatuses' : filters.status;
      const fileName = `leads_cleanup_${statusLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // Delete leads in batches
      const leadIds = allLeads.map(l => l.id);
      
      for (let i = 0; i < leadIds.length; i += DELETE_BATCH_SIZE) {
        const batch = leadIds.slice(i, i + DELETE_BATCH_SIZE);
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', batch);
        
        if (deleteError) throw deleteError;
      }

      return { exportedCount: allLeads.length, deletedCount: leadIds.length };
    },
    onSuccess: (data) => {
      toast.success('Leads exported & deleted', {
        description: `${data.deletedCount.toLocaleString()} leads removed`,
      });
      queryClient.invalidateQueries({ queryKey: ['lead-cleanup-preview'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: Error) => {
      toast.error('Cleanup failed', { description: error.message });
    },
  });
}
