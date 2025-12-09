import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

// Banks
export function useBanks() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-banks', storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_banks')
        .select('*')
        .eq('is_active', true)
        .order('bank_name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (bank: any) => {
      const { data, error } = await supabase
        .from('accounting_banks')
        .insert([{ ...bank, current_balance: bank.opening_balance, store_id: storeId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
      toast.success('Bank account added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add bank');
    },
  });
}

// Wholesalers
export function useWholesalers() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-wholesalers', storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_wholesalers')
        .select('*')
        .order('name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateWholesaler() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (wholesaler: any) => {
      const { data, error } = await supabase
        .from('accounting_wholesalers')
        .insert([{ ...wholesaler, current_balance: wholesaler.opening_balance, store_id: storeId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-wholesalers'] });
      toast.success('Wholesaler added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add wholesaler');
    },
  });
}

// Suppliers
export function useSuppliers() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-suppliers', storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_suppliers')
        .select('*')
        .order('name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (supplier: any) => {
      const { data, error } = await supabase
        .from('accounting_suppliers')
        .insert([{ ...supplier, current_balance: supplier.opening_balance, store_id: storeId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-suppliers'] });
      toast.success('Supplier added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add supplier');
    },
  });
}

// Expense Categories
export function useExpenseCategories() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-expense-categories', storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

// Dashboard Summary
export function useAccountingDashboard(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-dashboard', startDate, endDate, storeId],
    queryFn: async () => {
      // Cash Balance
      let cashQuery = supabase
        .from('accounting_cash_ledger')
        .select('transaction_type, amount')
        .lte('transaction_date', endDate);
      
      if (storeId) {
        cashQuery = cashQuery.eq('store_id', storeId);
      }

      const { data: cashData } = await cashQuery;
      
      const cashIn = cashData?.filter(t => t.transaction_type === 'IN').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cashOut = cashData?.filter(t => t.transaction_type === 'OUT').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cashBalance = cashIn - cashOut;

      // Bank Balance
      let bankQuery = supabase
        .from('accounting_banks')
        .select('current_balance')
        .eq('is_active', true);
      
      if (storeId) {
        bankQuery = bankQuery.eq('store_id', storeId);
      }

      const { data: banks } = await bankQuery;
      const bankBalance = banks?.reduce((sum, b) => sum + Number(b.current_balance), 0) || 0;

      // Today's Cashflow
      const today = new Date().toISOString().split('T')[0];
      let todayCashQuery = supabase
        .from('accounting_cash_ledger')
        .select('transaction_type, amount')
        .eq('transaction_date', today);
      
      if (storeId) {
        todayCashQuery = todayCashQuery.eq('store_id', storeId);
      }

      const { data: todayCash } = await todayCashQuery;
      
      const todayCashIn = todayCash?.filter(t => t.transaction_type === 'IN').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const todayCashOut = todayCash?.filter(t => t.transaction_type === 'OUT').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Receivables
      let invoicesQuery = supabase
        .from('accounting_invoices')
        .select('outstanding_amount')
        .in('status', ['SENT', 'PARTIALLY_PAID', 'OVERDUE']);
      
      if (storeId) {
        invoicesQuery = invoicesQuery.eq('store_id', storeId);
      }

      const { data: invoices } = await invoicesQuery;
      const totalReceivable = invoices?.reduce((sum, i) => sum + Number(i.outstanding_amount), 0) || 0;

      // Payables
      let billsQuery = supabase
        .from('accounting_bills')
        .select('outstanding_amount')
        .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);
      
      if (storeId) {
        billsQuery = billsQuery.eq('store_id', storeId);
      }

      const { data: bills } = await billsQuery;
      const totalPayable = bills?.reduce((sum, b) => sum + Number(b.outstanding_amount), 0) || 0;

      // Monthly P/L from daily_pl
      let plQuery = supabase
        .from('daily_pl')
        .select('actual_profit')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (storeId) {
        plQuery = plQuery.eq('store_id', storeId);
      }

      const { data: plData } = await plQuery;
      const monthlyProfit = plData?.reduce((sum, d) => sum + Number(d.actual_profit), 0) || 0;

      return {
        cashBalance,
        bankBalance,
        todayCashIn,
        todayCashOut,
        totalReceivable,
        totalPayable,
        monthlyProfit,
      };
    },
    enabled: !!storeId,
  });
}

// Invoices
export function useInvoices(filters?: { status?: string; startDate?: string; endDate?: string }) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-invoices', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_invoices')
        .select(`
          *,
          wholesaler:accounting_wholesalers(name),
          items:accounting_invoice_items(*)
        `)
        .order('invoice_date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.startDate) {
        query = query.gte('invoice_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('invoice_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async ({ invoice, items }: { invoice: any; items: any[] }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('accounting_invoices')
        .insert([{ 
          ...invoice, 
          created_by: user.user?.id,
          outstanding_amount: invoice.total_amount,
          store_id: storeId,
        }])
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;

      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: newInvoice.id,
      }));
      
      const { error: itemsError } = await supabase
        .from('accounting_invoice_items')
        .insert(itemsWithInvoiceId);
      
      if (itemsError) throw itemsError;

      return newInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-wholesalers'] });
      toast.success('Invoice created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });
}

// Bills
export function useBills(filters?: { status?: string; startDate?: string; endDate?: string }) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-bills', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_bills')
        .select(`
          *,
          supplier:accounting_suppliers(name),
          category:accounting_expense_categories(name)
        `)
        .order('bill_date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.startDate) {
        query = query.gte('bill_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('bill_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (bill: any) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('accounting_bills')
        .insert([{ 
          ...bill, 
          created_by: user.user?.id,
          outstanding_amount: bill.total_amount,
          store_id: storeId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-bills'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-suppliers'] });
      toast.success('Bill created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create bill');
    },
  });
}

// Payments
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: any) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: newPayment, error: paymentError } = await supabase
        .from('accounting_payments')
        .insert([{ ...payment, created_by: user.user?.id }])
        .select()
        .single();
      
      if (paymentError) throw paymentError;

      if (payment.invoice_id) {
        const { data: invoice } = await supabase
          .from('accounting_invoices')
          .select('*')
          .eq('id', payment.invoice_id)
          .single();
        
        if (invoice) {
          const newPaidAmount = Number(invoice.paid_amount) + Number(payment.amount);
          const newOutstanding = Number(invoice.total_amount) - newPaidAmount;
          const newStatus: 'PAID' | 'PARTIALLY_PAID' = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
          
          await supabase
            .from('accounting_invoices')
            .update({
              paid_amount: newPaidAmount,
              outstanding_amount: newOutstanding,
              status: newStatus,
            })
            .eq('id', payment.invoice_id);
        }
      }

      if (payment.bill_id) {
        const { data: bill } = await supabase
          .from('accounting_bills')
          .select('*')
          .eq('id', payment.bill_id)
          .single();
        
        if (bill) {
          const newPaidAmount = Number(bill.paid_amount) + Number(payment.amount);
          const newOutstanding = Number(bill.total_amount) - newPaidAmount;
          const newStatus: 'PAID' | 'PARTIALLY_PAID' = newOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
          
          await supabase
            .from('accounting_bills')
            .update({
              paid_amount: newPaidAmount,
              outstanding_amount: newOutstanding,
              status: newStatus,
            })
            .eq('id', payment.bill_id);
        }
      }

      if (payment.payment_method === 'BANK' && payment.bank_id) {
        const { data: bank } = await supabase
          .from('accounting_banks')
          .select('current_balance')
          .eq('id', payment.bank_id)
          .single();
        
        if (bank) {
          const adjustment = payment.invoice_id ? Number(payment.amount) : -Number(payment.amount);
          await supabase
            .from('accounting_banks')
            .update({
              current_balance: Number(bank.current_balance) + adjustment,
            })
            .eq('id', payment.bank_id);
        }
      }

      return newPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-bills'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success('Payment recorded');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });
}

// Cash Ledger
export function useCashLedger(startDate?: string, endDate?: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-cash-ledger', startDate, endDate, storeId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_cash_ledger')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (startDate) query = query.gte('transaction_date', startDate);
      if (endDate) query = query.lte('transaction_date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });
}

export function useCreateCashEntry() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (entry: any) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('accounting_cash_ledger')
        .insert([{ ...entry, created_by: user.user?.id, store_id: storeId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-cash-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success('Cash entry added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add cash entry');
    },
  });
}
