import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface CleanupCounts {
  cnr: number;
  cancelled: number;
  confirmed: number;
  old6Months: number;
  old1Year: number;
}

export function useLeadCleanupCounts() {
  return useQuery({
    queryKey: ['lead-cleanup-counts'],
    queryFn: async (): Promise<CleanupCounts> => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Fetch counts in parallel
      const [cnrResult, cancelledResult, confirmedResult, old6Result, old1Result] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'CALL_NOT_RECEIVED'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'CANCELLED'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'CONFIRMED').not('order_id', 'is', null),
        supabase.from('leads').select('id', { count: 'exact', head: true }).lt('created_at', sixMonthsAgo.toISOString()).not('status', 'in', '("NEW","ASSIGNED","FOLLOW_UP")'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).lt('created_at', oneYearAgo.toISOString()).not('status', 'in', '("NEW","ASSIGNED","FOLLOW_UP")'),
      ]);

      return {
        cnr: cnrResult.count || 0,
        cancelled: cancelledResult.count || 0,
        confirmed: confirmedResult.count || 0,
        old6Months: old6Result.count || 0,
        old1Year: old1Result.count || 0,
      };
    },
  });
}

type CleanupType = 'cnr' | 'cancelled' | 'confirmed' | 'old6Months' | 'old1Year';

export function useExportAndDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: CleanupType) => {
      let query = supabase.from('leads').select('*');
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Build query based on type
      switch (type) {
        case 'cnr':
          query = query.eq('status', 'CALL_NOT_RECEIVED');
          break;
        case 'cancelled':
          query = query.eq('status', 'CANCELLED');
          break;
        case 'confirmed':
          query = query.eq('status', 'CONFIRMED').not('order_id', 'is', null);
          break;
        case 'old6Months':
          query = query.lt('created_at', sixMonthsAgo.toISOString()).not('status', 'in', '("NEW","ASSIGNED","FOLLOW_UP")');
          break;
        case 'old1Year':
          query = query.lt('created_at', oneYearAgo.toISOString()).not('status', 'in', '("NEW","ASSIGNED","FOLLOW_UP")');
          break;
      }

      const { data: leads, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) throw new Error('No leads to export');

      // Export to Excel
      const exportData = leads.map(lead => ({
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
      
      const typeLabels: Record<CleanupType, string> = {
        cnr: 'CNR',
        cancelled: 'Cancelled',
        confirmed: 'Confirmed',
        old6Months: '6MonthsOld',
        old1Year: '1YearOld',
      };
      
      const fileName = `leads_${typeLabels[type]}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // Delete leads in batches of 500
      const leadIds = leads.map(l => l.id);
      const batchSize = 500;
      
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', batch);
        
        if (deleteError) throw deleteError;
      }

      return { exportedCount: leads.length, deletedCount: leadIds.length };
    },
    onSuccess: (data, type) => {
      const typeLabels: Record<CleanupType, string> = {
        cnr: 'CNR',
        cancelled: 'Cancelled',
        confirmed: 'Confirmed',
        old6Months: '6+ months old',
        old1Year: '1+ year old',
      };
      toast.success(`${typeLabels[type]} leads exported & deleted`, {
        description: `${data.deletedCount.toLocaleString()} leads removed`,
      });
      queryClient.invalidateQueries({ queryKey: ['lead-cleanup-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: Error) => {
      toast.error('Cleanup failed', { description: error.message });
    },
  });
}
