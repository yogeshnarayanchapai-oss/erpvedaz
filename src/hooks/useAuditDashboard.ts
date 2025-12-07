import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditFilters {
  fiscalYear?: string;
  fiscalQuarter?: string;
  fiscalMonth?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditManualEntry {
  id: string;
  category: string;
  sub_category?: string;
  description: string;
  amount: number;
  quantity?: number;
  date: string;
  fiscal_year?: string;
  fiscal_quarter?: string;
  fiscal_month?: string;
  notes?: string;
  include_in_audit: boolean;
  created_at: string;
}

export interface AuditSummary {
  totalSales: number;
  totalExpenses: number;
  totalPayroll: number;
  totalPurchase: number;
  profitLoss: number;
  cashBalance: number;
  bankBalance: number;
  receivables: number;
  payables: number;
  inventoryValue: number;
  salesCount: number;
  purchaseCount: number;
}

// Fetch company info
export function useCompanyInfo() {
  return useQuery({
    queryKey: ['company-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });
}

// Fetch audit summary data
export function useAuditSummary(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-summary', filters],
    queryFn: async () => {
      const { startDate, endDate } = filters;
      
      // Fetch sales data (delivered orders)
      const { data: salesData } = await supabase
        .from('orders')
        .select('amount, order_status')
        .eq('order_status', 'DELIVERED')
        .gte('order_date', startDate || '2020-01-01')
        .lte('order_date', endDate || new Date().toISOString().split('T')[0]);
      
      const totalSales = salesData?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
      const salesCount = salesData?.length || 0;

      // Fetch expenses
      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount, type')
        .in('type', ['expense', 'EXPENSE'])
        .gte('date', startDate || '2020-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0]);
      
      const totalExpenses = expenseData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Fetch payroll data from office_expenses with category 'Salary'
      const { data: payrollData } = await supabase
        .from('office_expenses')
        .select('amount, category')
        .eq('category', 'Salary')
        .gte('date', startDate || '2020-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0]);
      
      const totalPayroll = payrollData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Fetch purchase data (stock IN movements)
      const { data: purchaseData } = await supabase
        .from('stock_movements')
        .select('qty, unit_cost')
        .eq('movement_type', 'IN')
        .gte('movement_date', startDate || '2020-01-01')
        .lte('movement_date', endDate || new Date().toISOString().split('T')[0]);
      
      const totalPurchase = purchaseData?.reduce((sum, p) => sum + ((p.qty || 0) * (p.unit_cost || 0)), 0) || 0;
      const purchaseCount = purchaseData?.length || 0;

      // Fetch account balances
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('current_balance, type')
        .eq('is_active', true);
      
      let cashBalance = 0;
      let bankBalance = 0;
      accountsData?.forEach(acc => {
        if (acc.type === 'CASH') cashBalance += acc.current_balance || 0;
        if (acc.type === 'BANK') bankBalance += acc.current_balance || 0;
      });

      // Fetch receivables
      const { data: receivablesData } = await supabase
        .from('accounting_invoices')
        .select('outstanding_amount')
        .gt('outstanding_amount', 0);
      
      const receivables = receivablesData?.reduce((sum, r) => sum + (r.outstanding_amount || 0), 0) || 0;

      // Fetch payables
      const { data: payablesData } = await supabase
        .from('accounting_bills')
        .select('outstanding_amount')
        .gt('outstanding_amount', 0);
      
      const payables = payablesData?.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0) || 0;

      // Fetch inventory value
      const { data: inventoryData } = await supabase
        .from('product_inventory')
        .select('current_stock, products(cost_price)')
        .gt('current_stock', 0);
      
      const inventoryValue = inventoryData?.reduce((sum, inv) => {
        const costPrice = (inv.products as any)?.cost_price || 0;
        return sum + ((inv.current_stock || 0) * costPrice);
      }, 0) || 0;

      return {
        totalSales,
        totalExpenses,
        totalPayroll,
        totalPurchase,
        profitLoss: totalSales - totalExpenses - totalPayroll,
        cashBalance,
        bankBalance,
        receivables,
        payables,
        inventoryValue,
        salesCount,
        purchaseCount,
      } as AuditSummary;
    },
  });
}

// Fetch monthly sales for chart
export function useMonthlySales(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-monthly-sales', filters],
    queryFn: async () => {
      const { startDate, endDate } = filters;
      
      const { data } = await supabase
        .from('orders')
        .select('amount, order_date')
        .eq('order_status', 'DELIVERED')
        .gte('order_date', startDate || '2020-01-01')
        .lte('order_date', endDate || new Date().toISOString().split('T')[0]);
      
      // Group by month
      const monthlyData = new Map<string, number>();
      data?.forEach(order => {
        const month = order.order_date?.substring(0, 7) || '';
        monthlyData.set(month, (monthlyData.get(month) || 0) + (order.amount || 0));
      });
      
      return Array.from(monthlyData.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
  });
}

// Fetch expense breakdown for pie chart
export function useExpenseBreakdown(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-expense-breakdown', filters],
    queryFn: async () => {
      const { startDate, endDate } = filters;
      
      const { data } = await supabase
        .from('transactions')
        .select('amount, transaction_categories:category_id(name)')
        .in('type', ['expense', 'EXPENSE'])
        .gte('date', startDate || '2020-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0]);
      
      const categoryTotals = new Map<string, number>();
      data?.forEach(t => {
        const category = (t.transaction_categories as any)?.name || 'Uncategorized';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + (t.amount || 0));
      });
      
      return Array.from(categoryTotals.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
  });
}

// Fetch manual audit entries
export function useAuditManualEntries(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-manual-entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_manual_entries')
        .select('*')
        .order('date', { ascending: false });
      
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditManualEntry[];
    },
  });
}

// Create manual audit entry
export function useCreateAuditEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (entry: Omit<AuditManualEntry, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('audit_manual_entries')
        .insert(entry)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-manual-entries'] });
      toast({ title: 'Entry added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error adding entry', description: error.message, variant: 'destructive' });
    },
  });
}

// Toggle audit inclusion
export function useToggleAuditInclusion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ sourceTable, sourceId, include }: { sourceTable: string; sourceId: string; include: boolean }) => {
      const { data, error } = await supabase
        .from('audit_entry_toggles')
        .upsert({
          source_table: sourceTable,
          source_id: sourceId,
          include_in_audit: include,
          toggled_by: (await supabase.auth.getUser()).data.user?.id,
          toggled_at: new Date().toISOString(),
        }, { onConflict: 'source_table,source_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      toast({ title: 'Audit inclusion updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
    },
  });
}

// Save audit snapshot
export function useSaveAuditSnapshot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ name, data, fiscalYear, fiscalQuarter }: { name: string; data: any; fiscalYear?: string; fiscalQuarter?: string }) => {
      const { data: result, error } = await supabase
        .from('audit_snapshots')
        .insert({
          snapshot_name: name,
          snapshot_date: new Date().toISOString().split('T')[0],
          fiscal_year: fiscalYear,
          fiscal_quarter: fiscalQuarter,
          data,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-snapshots'] });
      toast({ title: 'Snapshot saved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error saving snapshot', description: error.message, variant: 'destructive' });
    },
  });
}
