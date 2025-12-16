import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLeads, useReturnLeadsToQueue, useAdminResendCNRToPool, useUpdateLead, useUpdateLeadStatus, Lead } from '@/hooks/useLeads';
import { useOrders, useCreateOrder } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useCallingStaff } from '@/hooks/useStaff';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoMarkSeen } from '@/hooks/useViewState';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useLeadAssignmentCounts } from '@/hooks/useLeadAssignmentCounts';
import { useCreateCallLog } from '@/hooks/useCallLogs';
import { useUpdateOrderItems } from '@/hooks/useOrderItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, Search, RotateCcw, CheckSquare, Send, Plus, ArrowRightLeft, Users, Package, Eye, Edit, Lock, UserPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { cn } from '@/lib/utils';
import { DeleteLeadsButton } from '@/components/leads/DeleteLeadsButton';
import { FormattedDate } from '@/components/FormattedDate';
import { BulkAddLeadsForm } from '@/components/leads/BulkAddLeadsForm';
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog';
import { AdminTransferLeadsModal } from '@/components/admin/AdminTransferLeadsModal';
import { TodayTransferProgress } from '@/components/admin/TodayTransferProgress';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { EditLeadSheet, EditLeadFormData } from '@/components/calling/EditLeadSheet';
import { toast } from 'sonner';
import { DuplicateBadge } from '@/components/leads/DuplicateBadge';
import { FileSpreadsheet } from 'lucide-react';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

export default function AdminLeads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const today = new Date();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const storeId = useCurrentStoreId();
  
  // Read initial values from URL params
  const initialFromParam = searchParams.get('from');
  const initialToParam = searchParams.get('to');
  const initialStatusParam = searchParams.get('status');
  
  // Tab state: 'today' or 'all'
  const [activeTab, setActiveTab] = useState<'today' | 'all'>(() => {
    // If URL params have a date range that's not today, show 'all'
    if (initialFromParam || initialToParam) {
      const todayStr = format(today, 'yyyy-MM-dd');
      if (initialFromParam !== todayStr || initialToParam !== todayStr) {
        return 'all';
      }
    }
    return 'today';
  });

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialFromParam && initialToParam) {
      return {
        from: startOfDay(new Date(initialFromParam)),
        to: endOfDay(new Date(initialToParam)),
      };
    }
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    };
  });
  
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusParam || 'all');
  const [search, setSearch] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTransferLeadsModal, setShowTransferLeadsModal] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignStaffId, setReassignStaffId] = useState('');

  const returnLeadsToQueue = useReturnLeadsToQueue();
  const resendCNRToPool = useAdminResendCNRToPool();
  const [showPoolDialog, setShowPoolDialog] = useState(false);

  // Hooks for editing leads (products fetched below with other data hooks)
  const updateLead = useUpdateLead();
  const updateLeadStatus = useUpdateLeadStatus();
  const createOrder = useCreateOrder();
  const createCallLog = useCreateCallLog();
  const updateOrderItems = useUpdateOrderItems();

  // Edit lead state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<EditLeadFormData>({
    destination_branch: '',
    branch_id: '',
    full_address: '',
    alt_phone: '',
    remark: '',
    status: '',
    quantity: '1',
    amount: '',
    delivery_location: '',
    is_cod: true,
    date: '',
    followup_preset: '',
    followup_date: '',
    followup_time: '',
    followup_reason: '',
    orderItems: [{ id: crypto.randomUUID(), product_id: '', product_name: '', quantity: 1, unit_price: 0, discount: 0 }],
  });
  const [isSavingLead, setIsSavingLead] = useState(false);

  // Check if user has permission (ADMIN, OWNER or MANAGER role)
  const canReturnLeads = profile?.role === 'ADMIN' || profile?.role === 'OWNER' || profile?.role === 'LEADS';
  const canManageLeads = profile?.role === 'ADMIN' || profile?.role === 'OWNER' || profile?.role === 'MANAGER';

  // Update date range when tab changes
  useEffect(() => {
    if (activeTab === 'today') {
      setDateRange({
        from: startOfDay(today),
        to: endOfDay(today),
      });
    } else {
      // For 'all' tab, show last 30 days by default if not set from URL
      if (!initialFromParam && !initialToParam) {
        setDateRange({
          from: startOfDay(subDays(today, 30)),
          to: endOfDay(today),
        });
      }
    }
  }, [activeTab]);

  // Clear URL params after reading
  useEffect(() => {
    if (searchParams.toString()) {
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [], isLoading, isFetched } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();
  
  // Use unified lead assignment counts hook (excludeSelfCreated: true for Admin Transfer Summary)
  const { data: leadAssignmentCounts } = useLeadAssignmentCounts({
    dateFrom,
    dateTo,
    excludeSelfCreated: true, // Exclude self-created for Staff Transfer Summary
  });

  // Fetch total remaining in pool (all time, not filtered by date)
  const [totalPoolCount, setTotalPoolCount] = useState(0);
  const [dateRangeAssignedLeads, setDateRangeAssignedLeads] = useState<{ id: string; assigned_to_user_id: string; first_assigned_to_user_id: string | null; created_by_user_id: string | null; product_id: string | null }[]>([]);
  const [allStoreLeads, setAllStoreLeads] = useState<{ id: string; date: string | null; product_id: string | null; assigned_to_user_id: string | null; first_assigned_to_user_id: string | null; created_by_user_id: string | null; pool_status: string | null; assigned_at: string | null; status: string | null; lead_bucket: string | null; entry_type: string | null }[]>([]);
  
  // Fetch all store leads for product summary (not filtered by date range)
  useEffect(() => {
    const fetchAllStoreLeads = async () => {
      if (!storeId) return;
      const { data } = await supabase
        .from('leads')
        .select('id, date, product_id, assigned_to_user_id, first_assigned_to_user_id, created_by_user_id, pool_status, assigned_at, status, lead_bucket, entry_type')
        .eq('store_id', storeId);
      
      setAllStoreLeads(data || []);
      // Count pool leads
      const poolLeads = (data || []).filter(l => l.pool_status === 'IN_POOL' && !l.assigned_to_user_id);
      setTotalPoolCount(poolLeads.length);
    };
    fetchAllStoreLeads();
  }, [storeId, leads]); // Refresh when leads change

  // Fetch leads assigned in selected date range from leads table (aggregates ALL assignments regardless of creator)
  useEffect(() => {
    const fetchDateRangeAssignedLeads = async () => {
      if (!storeId) return;
      const { data } = await supabase
        .from('leads')
        .select('id, assigned_to_user_id, first_assigned_to_user_id, created_by_user_id, product_id')
        .eq('store_id', storeId)
        .not('assigned_to_user_id', 'is', null)
        .gte('assigned_at', `${dateFrom}T00:00:00`)
        .lte('assigned_at', `${dateTo}T23:59:59`);
      setDateRangeAssignedLeads(data?.map(d => ({ 
        id: d.id,
        assigned_to_user_id: d.assigned_to_user_id!, 
        first_assigned_to_user_id: d.first_assigned_to_user_id,
        created_by_user_id: d.created_by_user_id,
        product_id: d.product_id 
      })) || []);
    };
    fetchDateRangeAssignedLeads();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-leads-assigned-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchDateRangeAssignedLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo, storeId]);

  // Mark section as seen when data loads (for badge clearing)
  useAutoMarkSeen('all_leads', isFetched && !isLoading);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredLeads = leads.filter((lead) => {
    const matchesProduct = selectedProduct === 'all' || lead.product_id === selectedProduct;
    // Handle special filters: "pending_transfer" and "duplicate"
    const matchesStatus = 
      selectedStatus === 'all' ? true :
      selectedStatus === 'pending_transfer' ? lead.is_transferred === false :
      selectedStatus === 'duplicate' ? lead.is_duplicate === true :
      lead.status === selectedStatus;
    // Handle assigned to filter
    const matchesAssignedTo = 
      assignedToFilter === 'all' ? true :
      assignedToFilter === 'UNASSIGNED' ? !lead.assigned_to_user_id :
      lead.assigned_to_user_id === assignedToFilter;
    // Check for reference ID search
    const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId(lead.reference_id, search);
    
    const matchesSearch =
      !search ||
      matchesRefId ||
      lead.client_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.contact_number.includes(search);
    return matchesProduct && matchesStatus && matchesAssignedTo && matchesSearch;
  }).sort((a, b) => {
    // Sort by created_at descending - newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length;
  const isSomeSelected = selectedLeads.length > 0 && selectedLeads.length < filteredLeads.length;

  // Staff Transfer Summary calculation - uses unified lead_transfers.transferred_at counting
  // excludeSelfCreated: true (only leads transferred from others, not self-created)
  const staffTransferSummary = useMemo(() => {
    const countsMap = leadAssignmentCounts?.countsByStaff || {};
    const transfersMap = leadAssignmentCounts?.transfersByStaff || {};
    
    return callingStaff.map(staff => {
      const transferCount = countsMap[staff.id] || 0;
      
      // New = leads currently assigned to this staff with NEW/ASSIGNED/null status (excluding self-created)
      const staffCurrentLeads = allStoreLeads.filter(l => 
        l.assigned_to_user_id === staff.id && l.created_by_user_id !== staff.id
      );
      const newLeads = staffCurrentLeads.filter(l => 
        l.status === 'ASSIGNED' || l.status === 'NEW' || !l.status
      ).length;
      
      // Products: get product counts from staff leads that were transferred in date range
      // We need to look up lead products from allStoreLeads using the lead IDs from transfers
      const staffTransfers = transfersMap[staff.id] || [];
      const transferredLeadIds = new Set(staffTransfers.map(t => t.leadId));
      
      const productCounts: Record<string, number> = {};
      allStoreLeads.forEach(lead => {
        if (!transferredLeadIds.has(lead.id)) return;
        if (lead.product_id) {
          const productName = products.find(p => p.id === lead.product_id)?.name;
          if (productName) {
            productCounts[productName] = (productCounts[productName] || 0) + 1;
          }
        }
      });
      
      const productEntries = Object.entries(productCounts);
      const fullProductList = productEntries.map(([name, qty]) => `${name} (${qty})`).join(', ');
      const shortProductList = productEntries.map(([name, qty]) => `${name.split(' ')[0]} (${qty})`).join(', ');
      const displayProducts = fullProductList.length > 40 ? shortProductList : fullProductList;

      return {
        id: staff.id,
        name: staff.name,
        transferCount,
        newLeads,
        products: displayProducts || '-',
        fullProducts: fullProductList || '-',
      };
    }).filter(s => s.transferCount > 0) // Only show staff with transferred leads in date range
      .sort((a, b) => b.transferCount - a.transferCount);
  }, [callingStaff, allStoreLeads, products, leadAssignmentCounts]);

  // Product Leads Summary calculation - filtered by selected date range using lead.date field
  const productSummary = useMemo(() => {
    return products.map(product => {
      const productLeads = allStoreLeads.filter(l => l.product_id === product.id);
      
      // Leads = total leads where lead.date is within date range
      const leadsInRange = productLeads.filter(l => {
        if (!l.date) return false;
        const leadDate = l.date.split('T')[0]; // Extract date part if timestamp
        return leadDate >= dateFrom && leadDate <= dateTo;
      }).length;
      
      // Transferred = total leads assigned in date range (by assigned_at)
      const transferredInRange = productLeads.filter(l => {
        if (!l.assigned_at) return false;
        const assignedDate = l.assigned_at.split('T')[0];
        return assignedDate >= dateFrom && assignedDate <= dateTo;
      }).length;
      
      // Remaining = Leads - Transferred
      const remaining = leadsInRange - transferredInRange;

      return {
        id: product.id,
        name: product.name,
        leadsInRange,
        transferredInRange,
        remaining: Math.max(0, remaining),
      };
    }).filter(p => p.leadsInRange > 0 || p.transferredInRange > 0);
  }, [products, allStoreLeads, dateFrom, dateTo]);

  // Transfer Progress calculation - uses lead_transfers (via useLeadAssignmentCounts) as source of truth
  // This ensures Today's Transfer Progress matches Staff Transfer Summary
  const transferProgressStats = useMemo(() => {
    // Use lead_transfers-based count for transferred (same as Staff Transfer Summary)
    const transferredInRange = leadAssignmentCounts?.totalCount || 0;
    
    // Get all lead IDs that were transferred in date range from the hook
    const transferredLeadIds = new Set<string>();
    Object.values(leadAssignmentCounts?.transfersByStaff || {}).forEach(transfers => {
      transfers.forEach(t => transferredLeadIds.add(t.leadId));
    });
    
    // Leads created in date range (for total calculation)
    const leadsCreatedInRange = allStoreLeads.filter(l => {
      if (!l.date) return false;
      const leadDate = l.date.split('T')[0];
      return leadDate >= dateFrom && leadDate <= dateTo;
    });
    
    // Total = leads created in range OR transferred in range (unique)
    const totalLeadIds = new Set<string>();
    leadsCreatedInRange.forEach(l => totalLeadIds.add(l.id));
    transferredLeadIds.forEach(id => totalLeadIds.add(id));
    const totalLeadsInRange = totalLeadIds.size;
    
    // Remaining = total minus transferred
    const remainingInRange = Math.max(0, totalLeadsInRange - transferredInRange);
    
    // Today Lead = NEW bucket leads that have been transferred (from transferredLeadIds)
    const todayLeadsTransferred = allStoreLeads.filter(l => 
      transferredLeadIds.has(l.id) && 
      l.lead_bucket === 'NEW' && 
      l.status !== 'CALL_NOT_RECEIVED'
    ).length;
    
    // CNR Lead = CNR leads that have been transferred (from transferredLeadIds)
    const cnrLeadsTransferred = allStoreLeads.filter(l => 
      transferredLeadIds.has(l.id) && 
      (l.lead_bucket === 'CNR_POOL' || l.status === 'CALL_NOT_RECEIVED')
    ).length;
    
    // Entry type breakdown (from transferred leads)
    const bulkEntryTransferred = allStoreLeads.filter(l => 
      transferredLeadIds.has(l.id) && l.entry_type === 'BULK'
    ).length;
    const importEntryTransferred = allStoreLeads.filter(l => 
      transferredLeadIds.has(l.id) && l.entry_type === 'IMPORT'
    ).length;
    const singleEntryTransferred = allStoreLeads.filter(l => 
      transferredLeadIds.has(l.id) && (l.entry_type === 'SINGLE' || !l.entry_type)
    ).length;

    return {
      totalLeadsInRange,
      transferredInRange,
      remainingInRange,
      todayLeadsTransferred,
      cnrLeadsTransferred,
      totalRemainingInPool: totalPoolCount,
      bulkEntryTransferred,
      importEntryTransferred,
      singleEntryTransferred,
    };
  }, [allStoreLeads, dateFrom, dateTo, totalPoolCount, leadAssignmentCounts]);

  // Check if "Send back to Leads" button should be shown
  const showReturnButton = selectedStatus === 'CALL_NOT_RECEIVED' && canReturnLeads;
  const canReturn = showReturnButton && selectedLeads.length > 0;

  const handleReturnToLeads = async () => {
    try {
      await returnLeadsToQueue.mutateAsync(selectedLeads);
      setSelectedLeads([]);
      setShowReturnDialog(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSendToPool = async () => {
    try {
      await resendCNRToPool.mutateAsync(selectedLeads);
      setSelectedLeads([]);
      setShowPoolDialog(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Lead detail handlers
  const handleViewLead = (lead: Lead) => {
    setSelectedLeadForDetail(lead);
    setShowLeadDetail(true);
  };

  const handleEditLead = async (lead: Lead) => {
    const product = products.find(p => p.id === lead.product_id);
    
    // If lead has an existing order, fetch its details
    let orderItems = product 
      ? [{ id: crypto.randomUUID(), product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.sell_price || 0, discount: 0 }] 
      : [{ id: crypto.randomUUID(), product_id: '', product_name: '', quantity: 1, unit_price: 0, discount: 0 }];
    let deliveryLocation = '';
    let isCod = true;

    if (lead.order_id) {
      const [orderResult, itemsResult] = await Promise.all([
        supabase.from('orders').select('delivery_location, is_cod').eq('id', lead.order_id).single(),
        supabase.from('order_items').select('*').eq('order_id', lead.order_id),
      ]);

      if (orderResult.data) {
        deliveryLocation = orderResult.data.delivery_location || '';
        isCod = orderResult.data.is_cod ?? true;
      }

      if (itemsResult.data && itemsResult.data.length > 0) {
        orderItems = itemsResult.data.map(item => ({
          id: item.id as `${string}-${string}-${string}-${string}-${string}`,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
        }));
      }
    }

    setEditForm({
      destination_branch: lead.destination_branch || '',
      branch_id: lead.branch_id || '',
      full_address: lead.full_address || '',
      alt_phone: lead.alt_phone || '',
      remark: lead.remark || '',
      status: lead.status,
      quantity: '1',
      amount: product?.sell_price?.toString() || '',
      delivery_location: deliveryLocation,
      is_cod: isCod,
      date: lead.date || '',
      followup_preset: '',
      followup_date: lead.next_followup_at ? lead.next_followup_at.split('T')[0] : '',
      followup_time: lead.next_followup_at ? lead.next_followup_at.split('T')[1]?.substring(0, 5) || '' : '',
      followup_reason: lead.followup_reason || '',
      orderItems: orderItems,
    });
    setEditingLead(lead);
  };

  const handleSaveEditedLead = async () => {
    if (!editingLead) return;
    setIsSavingLead(true);

    try {
      // Build follow-up timestamp if status is FOLLOW_UP
      let followupData: { 
        next_followup_at?: string; 
        followup_reason?: string;
        is_followup_reminded?: boolean;
        followup_completed?: boolean;
      } = {};
      
      if (editForm.status === 'FOLLOW_UP' && editForm.followup_date && editForm.followup_time) {
        followupData = {
          next_followup_at: `${editForm.followup_date}T${editForm.followup_time}:00`,
          followup_reason: editForm.followup_reason || undefined,
          is_followup_reminded: false,
          followup_completed: false,
        };
      }
      
      // If transitioning away from FOLLOW_UP to another status, mark as completed
      if (editingLead.status === 'FOLLOW_UP' && editForm.status !== 'FOLLOW_UP') {
        followupData.followup_completed = true;
      }

      await updateLead.mutateAsync({
        leadId: editingLead.id,
        destination_branch: editForm.destination_branch || undefined,
        branch_id: editForm.branch_id || undefined,
        full_address: editForm.full_address || undefined,
        alt_phone: editForm.alt_phone || undefined,
        remark: editForm.remark || undefined,
        date: editForm.date || undefined,
        ...followupData,
      });

      // Create followup log if status changed
      if (editForm.status !== editingLead.status) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('followup_logs').insert({
              lead_id: editingLead.id,
              updated_by: user.id,
              old_status: editingLead.status,
              new_status: editForm.status,
              note: editForm.remark || editForm.followup_reason,
            });
          }
        } catch (logError) {
          console.error('Failed to create followup log:', logError);
        }
      }

      // Only create order if lead doesn't already have one
      if (editForm.status === 'CONFIRMED' && !editingLead.order_id) {
        if (!editForm.delivery_location) {
          toast.error('Please select a delivery location (Inside/Outside Valley) before confirming');
          setIsSavingLead(false);
          return;
        }

        const validItems = (editForm.orderItems || []).filter(item => item.product_id);
        if (validItems.length === 0) {
          toast.error('Please add at least one product to the order');
          setIsSavingLead(false);
          return;
        }
        
        const grandTotal = validItems.reduce((sum, item) => {
          const subtotal = item.quantity * item.unit_price;
          return sum + Math.max(0, subtotal - (item.discount || 0));
        }, 0);
        const totalQty = validItems.reduce((sum, item) => sum + item.quantity, 0);
        
        await createOrder.mutateAsync({
          leadId: editingLead.id,
          productId: validItems[0].product_id,
          quantity: totalQty,
          amount: grandTotal,
          destinationBranch: editForm.destination_branch,
          branchId: editForm.branch_id || undefined,
          fullAddress: editForm.full_address,
          deliveryLocation: editForm.delivery_location as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY',
          isCod: editForm.is_cod,
          items: validItems.map(item => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
          })),
        });
        
        await createCallLog.mutateAsync({
          leadId: editingLead.id,
          outcome: 'Confirmed',
          notes: editForm.remark,
        });
      } else if (editForm.status === 'CONFIRMED' && editingLead.order_id) {
        // Update existing order
        const validItems = (editForm.orderItems || []).filter(item => item.product_id);
        const grandTotal = validItems.reduce((sum, item) => {
          const subtotal = item.quantity * item.unit_price;
          return sum + Math.max(0, subtotal - (item.discount || 0));
        }, 0);
        const totalQty = validItems.reduce((sum, item) => sum + item.quantity, 0);

        await supabase.from('orders').update({
          destination_branch: editForm.destination_branch || undefined,
          branch_id: editForm.branch_id || undefined,
          full_address: editForm.full_address || undefined,
          delivery_location: editForm.delivery_location || undefined,
          is_cod: editForm.is_cod,
          quantity: totalQty || 1,
          amount: grandTotal || undefined,
          product_id: validItems[0]?.product_id || undefined,
        }).eq('id', editingLead.order_id);

        await updateOrderItems.mutateAsync({
          orderId: editingLead.order_id,
          items: validItems.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
          })),
        });
      } else if (editForm.status !== editingLead.status) {
        await updateLeadStatus.mutateAsync({
          leadId: editingLead.id,
          status: editForm.status as any,
          remark: editForm.remark,
        });
        
        await createCallLog.mutateAsync({
          leadId: editingLead.id,
          outcome: editForm.status.replace('_', ' '),
          notes: editForm.remark,
        });
      }

      toast.success('Lead updated successfully');
      setEditingLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error(error);
      toast.error('Failed to update lead');
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleCreateOrderFromLead = (lead: Lead) => {
    // Navigate to order creation with lead data pre-filled
    toast.info('Creating order from lead...');
    navigate(`/calling/orders?createFromLead=${lead.id}`);
  };

  const handleCallLead = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsAppLead = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
  };

  const handleBulkReassign = async () => {
    if (!reassignStaffId || selectedLeads.length === 0) return;
    
    // Check if any selected leads have ASSIGNED status - they cannot be reassigned
    const selectedLeadObjects = filteredLeads.filter(l => selectedLeads.includes(l.id));
    const assignedStatusLeads = selectedLeadObjects.filter(l => l.status === 'ASSIGNED');
    
    if (assignedStatusLeads.length > 0) {
      toast.error(`Cannot reassign ${assignedStatusLeads.length} lead(s) with ASSIGNED status. Staff must first work on the lead (change status to CONFIRMED, FOLLOW_UP, CNR, or CANCELLED).`);
      return;
    }
    
    // Check for same-day leads - they cannot be reassigned today
    const today = format(new Date(), 'yyyy-MM-dd');
    const sameDayLeads = selectedLeadObjects.filter(l => l.date === today);
    
    if (sameDayLeads.length > 0) {
      toast.error(`Cannot reassign ${sameDayLeads.length} lead(s) with today's date. Leads can only be reassigned the next day.`);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: reassignStaffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
          assigned_at: new Date().toISOString(),
          remark: '', // Clear remark when reassigning to new staff
          date: new Date().toISOString().split('T')[0], // Set today's date when reassigning
        })
        .in('id', selectedLeads);

      if (error) throw error;

      // Log transfers with store_id for unified counting
      const transfers = selectedLeads.map(leadId => ({
        lead_id: leadId,
        from_user_id: profile?.id,
        to_user_id: reassignStaffId,
        transferred_at: new Date().toISOString(),
        store_id: storeId,
      }));
      await supabase.from('lead_transfers').insert(transfers);

      // Send notification to the new assigned staff
      await supabase.from('notifications').insert({
        type: 'LEAD_ASSIGNED',
        title: 'New Leads Reassigned',
        message: `Assigned new ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''} to you.`,
        target_user_id: reassignStaffId,
        actor_id: profile?.id,
        actor_name: profile?.name || 'Admin',
        portal: 'CALLING',
        link_path: '/calling/leads',
      });

      toast.success(`Reassigned ${selectedLeads.length} leads`);
      setSelectedLeads([]);
      setIsReassignOpen(false);
      setReassignStaffId('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to reassign leads');
    }
  };

  // Count duplicates
  const duplicateCount = leads.filter(l => l.is_duplicate).length;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">View and filter all leads</p>
          </div>
          {duplicateCount > 0 && (
            <Button 
              variant={selectedStatus === 'duplicate' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedStatus(selectedStatus === 'duplicate' ? 'all' : 'duplicate')}
              className="gap-1 bg-orange-500/10 border-orange-500/30 text-orange-600 hover:bg-orange-500/20 text-xs md:text-sm"
            >
              Double ({duplicateCount})
            </Button>
          )}
        </div>
        
        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'all')}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs md:text-sm h-7 px-2 md:px-3">Today</TabsTrigger>
              <TabsTrigger value="all" className="text-xs md:text-sm h-7 px-2 md:px-3">All</TabsTrigger>
            </TabsList>
          </Tabs>
          {canManageLeads && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowTransferLeadsModal(true)} className="gap-1 text-xs md:text-sm">
                <ArrowRightLeft className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Transfer</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="gap-1 text-xs md:text-sm">
                <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button size="sm" onClick={() => setShowAddLeadDialog(true)} className="gap-1 text-xs md:text-sm">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transfer Progress Widget with Stats - filtered by date range */}
      {canManageLeads && (
        <TodayTransferProgress
          totalTodayLeads={transferProgressStats.totalLeadsInRange}
          transferredToday={transferProgressStats.transferredInRange}
          remainingTodayLeads={transferProgressStats.remainingInRange}
          todayLeadsTransferred={transferProgressStats.todayLeadsTransferred}
          cnrLeadsTransferred={transferProgressStats.cnrLeadsTransferred}
          totalRemainingInPool={transferProgressStats.totalRemainingInPool}
          dateLabel={dateFrom === dateTo ? 'Today' : `${dateFrom} to ${dateTo}`}
          showTotalInstead={true}
          bulkEntryTransferred={transferProgressStats.bulkEntryTransferred}
          importEntryTransferred={transferProgressStats.importEntryTransferred}
          singleEntryTransferred={transferProgressStats.singleEntryTransferred}
        />
      )}

      {/* Leads Overview - Admin Summary Cards */}
      {canManageLeads && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Product Leads Summary */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Package className="w-4 h-4 md:w-5 md:h-5" />
                Product Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:px-6 md:pb-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header text-xs md:text-sm">Product</TableHead>
                      <TableHead className="table-header text-center text-xs md:text-sm">Leads</TableHead>
                      <TableHead className="table-header text-center text-xs md:text-sm">Transferred</TableHead>
                      <TableHead className="table-header text-center text-xs md:text-sm">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSummary.length > 0 ? (
                      productSummary.map((product) => (
                        <TableRow key={product.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs md:text-sm">{product.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-info/5 text-xs">
                              {product.leadsInRange.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-success/5 text-xs">
                              {product.transferredInRange.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-warning/5 text-xs">
                              {product.remaining.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-xs md:text-sm text-muted-foreground">
                          No leads in selected range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Staff Transfer Summary */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Users className="w-4 h-4 md:w-5 md:h-5" />
                Staff Transfer Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:px-6 md:pb-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header text-xs md:text-sm">Staff</TableHead>
                      <TableHead className="table-header text-center text-xs md:text-sm">Transferred</TableHead>
                      <TableHead className="table-header text-center text-xs md:text-sm">New</TableHead>
                      <TableHead className="table-header text-xs md:text-sm hidden md:table-cell">Products</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffTransferSummary.length > 0 ? (
                      staffTransferSummary.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs md:text-sm">{staff.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-primary/5 text-xs">
                              {staff.transferCount.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-secondary/5 text-xs">
                              {staff.newLeads.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell 
                            className="text-xs text-muted-foreground max-w-[150px] truncate hidden md:table-cell"
                            title={staff.fullProducts}
                          >
                            {staff.products}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-xs md:text-sm text-muted-foreground">
                          No transfers in selected range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col gap-3">
            {/* Search first on mobile */}
            <div className="relative md:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filters row - scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 pb-2 md:pb-0 md:flex-wrap md:items-center">
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                  <span className="text-xs text-muted-foreground hidden lg:inline">by creation date</span>
                </div>
              )}
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-[120px] md:w-[180px] h-9 flex-shrink-0">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[100px] md:w-[150px] h-9 flex-shrink-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_transfer">Pending Transfer</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="CALL_NOT_RECEIVED">CNR</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REDIRECT">Redirect</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                <SelectTrigger className="w-[110px] md:w-[150px] h-9 flex-shrink-0">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {callingStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Desktop search */}
              <div className="relative flex-1 min-w-[200px] hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Phone className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            {activeTab === 'today' ? "Today's Leads" : 'Leads'} ({filteredLeads.length})
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {showReturnButton && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))}
                  disabled={filteredLeads.length === 0 || selectedLeads.length === filteredLeads.length}
                  className="gap-1 text-xs"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span className="hidden sm:inline">Select All</span> ({filteredLeads.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPoolDialog(true)}
                  disabled={!canReturn || resendCNRToPool.isPending}
                  className="gap-1 text-xs"
                >
                  <Send className="w-3 h-3" />
                  <span className="hidden sm:inline">Pool</span> {selectedLeads.length > 0 && `(${selectedLeads.length})`}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={!canReturn || returnLeadsToQueue.isPending}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Return</span> {selectedLeads.length > 0 && `(${selectedLeads.length})`}
                </Button>
              </>
            )}
            {selectedLeads.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReassignOpen(true)}
                className="gap-1 text-xs"
              >
                <UserPlus className="w-3 h-3" />
                Reassign ({selectedLeads.length})
              </Button>
            )}
            <DeleteLeadsButton 
              selectedIds={selectedLeads} 
              onDeleteComplete={() => setSelectedLeads([])} 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2 p-3">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading...' : 'No leads found'}
              </div>
            ) : (
              filteredLeads.map((lead, index) => (
                <div 
                  key={lead.id}
                  className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewLead(lead)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      />
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn("text-xs", getLeadStatusBadgeClass(lead.status || 'NEW'))}>
                        {formatStatusLabel(lead.status || 'NEW')}
                      </Badge>
                      {(lead.status === 'CONFIRMED' || lead.order_id) && (
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="pl-6">
                    <div className="flex items-center gap-2 font-medium">
                      {lead.client_name}
                      <DuplicateBadge phone={lead.contact_number} isDuplicate={lead.is_duplicate} />
                    </div>
                    <div className="text-sm text-muted-foreground">{lead.contact_number}</div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="bg-muted px-2 py-0.5 rounded">{lead.products?.name || 'No product'}</span>
                      {lead.destination_branch && <span className="bg-muted px-2 py-0.5 rounded">{lead.destination_branch}</span>}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <FormattedDate date={lead.date} />
                      <span>{lead.assigned_to?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => handleViewLead(lead)} className="h-7 w-7 p-0">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditLead(lead)} className="h-7 w-7 p-0">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header w-[60px] text-center sticky left-0 bg-background z-10">S.No</TableHead>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={isSomeSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Customer</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Assigned To</TableHead>
                  <TableHead className="table-header">Created By</TableHead>
                  <TableHead className="table-header text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead, index) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewLead(lead)}>
                    <TableCell className="w-[60px] text-center font-medium text-muted-foreground sticky left-0 bg-background z-10">
                      {index + 1}
                    </TableCell>
                    <TableCell className="w-[50px] text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                        aria-label={`Select ${lead.client_name}`}
                      />
                    </TableCell>
                    <TableCell><FormattedDate date={lead.date} /></TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {lead.client_name}
                        <DuplicateBadge phone={lead.contact_number} isDuplicate={lead.is_duplicate} />
                      </div>
                    </TableCell>
                    <TableCell>{lead.contact_number}</TableCell>
                    <TableCell>{lead.products?.name || '-'}</TableCell>
                    <TableCell>{lead.destination_branch || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={getLeadStatusBadgeClass(lead.status || 'NEW')}>
                          {formatStatusLabel(lead.status || 'NEW')}
                        </Badge>
                        {(lead.status === 'CONFIRMED' || lead.order_id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This lead is confirmed and cannot be transferred</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(lead.status === 'CONFIRMED' || lead.order_id) ? (
                        <span className="text-muted-foreground">{lead.assigned_to?.name || '-'}</span>
                      ) : (
                        lead.assigned_to?.name || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.created_by_staff?.name || '-'}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewLead(lead)} className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditLead(lead)} className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No leads found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Send to Pool Dialog */}
      <AlertDialog open={showPoolDialog} onOpenChange={setShowPoolDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send CNR leads to Leads Pool?</AlertDialogTitle>
            <AlertDialogDescription>
              These {selectedLeads.length} CNR lead{selectedLeads.length > 1 ? 's' : ''} will be added to the CNR pool for the Leads team to reassign. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSendToPool}
              disabled={resendCNRToPool.isPending}
            >
              {resendCNRToPool.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return to Leads Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send selected leads back to Leads queue?</AlertDialogTitle>
            <AlertDialogDescription>
              These {selectedLeads.length} Call Not Received lead{selectedLeads.length > 1 ? 's' : ''} will be returned to the Leads Portal as fresh leads. Assigned caller will be cleared. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReturnToLeads}
              disabled={returnLeadsToQueue.isPending}
            >
              {returnLeadsToQueue.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Add Leads Form */}
      <BulkAddLeadsForm 
        open={showAddLeadDialog} 
        onOpenChange={setShowAddLeadDialog} 
      />

      {/* Import Leads Dialog */}
      <ImportLeadsDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
        portalType="ADMIN"
      />
      
      {/* Admin Transfer Leads Modal */}
      <AdminTransferLeadsModal
        open={showTransferLeadsModal}
        onOpenChange={setShowTransferLeadsModal}
      />

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLeadForDetail}
        open={showLeadDetail}
        onOpenChange={setShowLeadDetail}
        onEdit={handleEditLead}
        onCreateOrder={handleCreateOrderFromLead}
        onCall={handleCallLead}
        onWhatsApp={handleWhatsAppLead}
      />

      {/* Edit Lead Sheet with Customer Insight */}
      <EditLeadSheet
        lead={editingLead}
        formData={editForm}
        onFormChange={setEditForm}
        onSave={handleSaveEditedLead}
        onClose={() => setEditingLead(null)}
        onCall={(lead, phone) => window.location.href = `tel:${phone}`}
        onWhatsApp={(lead) => window.open(`https://wa.me/${lead.contact_number.replace(/\D/g, '')}`, '_blank')}
        isSaving={isSavingLead}
      />

      {/* Reassign Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {selectedLeads.length} Lead(s)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Select Staff</label>
            <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose staff member" />
              </SelectTrigger>
              <SelectContent>
                {callingStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={!reassignStaffId}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}