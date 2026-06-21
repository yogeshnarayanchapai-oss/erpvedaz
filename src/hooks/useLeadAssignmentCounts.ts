import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

interface LeadAssignmentCountOptions {
  staffId?: string;           // Optional: filter by specific staff
  dateFrom: string;           // Date range start (YYYY-MM-DD)
  dateTo: string;             // Date range end (YYYY-MM-DD)
  excludeSelfCreated?: boolean; // true for Admin Transfer Summary
}

interface TransferInfo {
  leadId: string;
  transferredAt: string;
  fromTeam: string | null;
  leadDate: string | null;
  leadType: string | null;
  fromUserId: string | null;
}

interface LeadAssignmentCountResult {
  countsByStaff: Record<string, number>;
  totalCount: number;
  transfersByStaff: Record<string, TransferInfo[]>;
}

/**
 * Unified hook for counting leads using lead_transfers.transferred_at as single source of truth.
 * 
 * COUNTING LOGIC:
 * - All counts are based on lead_transfers table entries
 * - transferred_at date determines which date a lead counts towards
 * - Supports reassignment chains: Ganesh (12/11) → Bijita (12/12) → Ram (12/13)
 *   Each staff member's count is based on when THEY received the lead (transferred_at)
 * - Historical counts NEVER decrease
 * 
 * USE CASES:
 * - Calling Dashboard & Staff Leaderboard: excludeSelfCreated = false (include all)
 * - Admin Transfer Summary: excludeSelfCreated = true (exclude self-created)
 */
export function useLeadAssignmentCounts(options: LeadAssignmentCountOptions) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['lead-assignment-counts', options.staffId, options.dateFrom, options.dateTo, options.excludeSelfCreated, storeId],
    queryFn: async (): Promise<LeadAssignmentCountResult> => {
      if (!storeId) {
        return { countsByStaff: {}, totalCount: 0, transfersByStaff: {} };
      }

      // Query lead_transfers with store filter via leads join
      // Nepal timezone offset: +05:45
      const dateFromStart = `${options.dateFrom}T00:00:00+05:45`;
      const dateToEnd = `${options.dateTo}T23:59:59+05:45`;

      // Fetch ALL lead_transfers using pagination to overcome 1000-row limit
      const allTransfers: any[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('lead_transfers')
          .select(`
            id,
            lead_id,
            to_user_id,
            from_user_id,
            transferred_at,
            transferred_by_user_id,
            store_id,
            from_team,
            lead_type
          `)
          .eq('store_id', storeId)
          .gte('transferred_at', dateFromStart)
          .lte('transferred_at', dateToEnd)
          .not('to_user_id', 'is', null)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        // Filter by specific staff if provided
        if (options.staffId) {
          query = query.eq('to_user_id', options.staffId);
        }

        const { data: transfers, error } = await query;
        if (error) throw error;

        if (transfers && transfers.length > 0) {
          allTransfers.push(...transfers);
          hasMore = transfers.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      let filteredTransfers = allTransfers;

      // We always need to fetch lead info to get the lead date
      // Also used for excludeSelfCreated check
      const leadIds = [...new Set(filteredTransfers.map(t => t.lead_id))];
      let leadDataMap = new Map<string, { creatorId: string | null; date: string | null }>();
      
      if (leadIds.length > 0) {
        // Fetch leads in batches to handle large numbers of IDs
        const BATCH_SIZE = 500; // Postgres IN clause limit consideration
        const allLeads: any[] = [];
        
        for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
          const batchIds = leadIds.slice(i, i + BATCH_SIZE);
          const { data: leads } = await supabase
            .from('leads')
            .select('id, created_by_user_id, date')
            .in('id', batchIds);
          
          if (leads) {
            allLeads.push(...leads);
          }
        }
        
        leadDataMap = new Map(allLeads.map(l => [l.id, { creatorId: l.created_by_user_id, date: l.date }]));
      }

      // For excludeSelfCreated, filter out self-created transfers
      if (options.excludeSelfCreated && filteredTransfers.length > 0) {
        filteredTransfers = filteredTransfers.filter(t => {
          const leadData = leadDataMap.get(t.lead_id);
          return leadData?.creatorId !== t.to_user_id;
        });
      }

      // Group by staff and count unique leads (Set ensures no double counting)
      const staffCounts = new Map<string, Set<string>>();
      const staffTransfers = new Map<string, { leadId: string; transferredAt: string; fromTeam: string | null; leadDate: string | null; leadType: string | null }[]>();

      filteredTransfers.forEach(transfer => {
        const staffId = transfer.to_user_id;
        if (!staffId) return;

        // Count unique leads per staff
        if (!staffCounts.has(staffId)) {
          staffCounts.set(staffId, new Set());
        }
        staffCounts.get(staffId)!.add(transfer.lead_id);

        // Track individual transfers for reference with lead date and type
        if (!staffTransfers.has(staffId)) {
          staffTransfers.set(staffId, []);
        }
        const leadData = leadDataMap.get(transfer.lead_id);
        staffTransfers.get(staffId)!.push({
          leadId: transfer.lead_id,
          transferredAt: transfer.transferred_at,
          fromTeam: transfer.from_team,
          leadDate: leadData?.date || null,
          leadType: (transfer as any).lead_type || null,
        });
      });

      // Build result
      const countsByStaff: Record<string, number> = {};
      const transfersByStaff: Record<string, { leadId: string; transferredAt: string; fromTeam: string | null; leadDate: string | null; leadType: string | null }[]> = {};
      let totalCount = 0;

      staffCounts.forEach((leadIds, id) => {
        countsByStaff[id] = leadIds.size;
        totalCount += leadIds.size;
      });

      staffTransfers.forEach((transfers, id) => {
        transfersByStaff[id] = transfers;
      });

      return {
        countsByStaff,
        totalCount,
        transfersByStaff,
      };
    },
    enabled: !!storeId && !!options.dateFrom && !!options.dateTo,
  });
}
