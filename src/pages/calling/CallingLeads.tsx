import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads, useUpdateLead, useUpdateLeadStatus, useTransferToFollowup, useTransferToLeads, useMarkAsCNR, Lead, TransferReason } from '@/hooks/useLeads';
import { useLeadAssignmentNotifications } from '@/hooks/useLeadAssignmentNotifications';
import { useProducts } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCreateCallLog, useCallLogsByUser } from '@/hooks/useCallLogs';
import { useOrderItemsByOrderIds, useUpdateOrderItems } from '@/hooks/useOrderItems';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, MessageSquare, PhoneOff, Clock, XCircle, Edit, ArrowRightLeft, Timer, Users, CornerDownLeft, Copy } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { toast } from 'sonner';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog';
import { FormattedDate } from '@/components/FormattedDate';
import { EditLeadSheet, EditLeadFormData } from '@/components/calling/EditLeadSheet';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';
import { DuplicateBadge } from '@/components/leads/DuplicateBadge';
import { LeadFiltersCard, DatePreset, FollowupFilterType } from '@/components/filters/LeadFiltersCard';
import { AddLeadDropdown } from '@/components/filters/AddLeadDropdown';

export default function CallingLeads() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  
  // Enable real-time notifications for new lead assignments
  useLeadAssignmentNotifications(profile?.id);
  
  // Check for URL params to set initial filter
  const statusParam = searchParams.get('status');
  const filterParam = searchParams.get('filter');
  const followupParam = searchParams.get('followup');
  const leadIdParam = searchParams.get('leadId');
  
// Filter states - initialize based to show all leads when leadId is provided
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDateFrom, setCustomDateFrom] = useState(today);
  const [customDateTo, setCustomDateTo] = useState(today);
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (leadIdParam) return 'ALL'; // Show all when opening specific lead
    if (statusParam) return statusParam;
    if (filterParam === 'remaining') return 'REMAINING';
    return 'ALL';
  });
  const [followupFilter, setFollowupFilter] = useState<FollowupFilterType>(() => {
    if (followupParam && ['today', 'upcoming', 'pending', 'overdue'].includes(followupParam)) {
      return followupParam as FollowupFilterType;
    }
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  
  // Track if leadId param has been processed
  const [leadIdProcessed, setLeadIdProcessed] = useState(false);
  
  // Handle URL params - update status filter and clear params
  useEffect(() => {
    if (statusParam || filterParam || followupParam) {
      if (statusParam) {
        setStatusFilter(statusParam);
      } else if (filterParam === 'remaining') {
        setStatusFilter('REMAINING');
      }
      if (followupParam && ['today', 'upcoming', 'pending', 'overdue'].includes(followupParam)) {
        setFollowupFilter(followupParam as FollowupFilterType);
        setStatusFilter('FOLLOW_UP'); // Auto-set status to Follow Up when filtering by followup
        setDatePreset('last30');
      }
      // Clear URL params after applying
      setSearchParams({}, { replace: true });
    }
  }, [statusParam, filterParam, followupParam, setSearchParams]);
  
  const dateRange = useMemo(() => {
    if (datePreset === 'today') return { from: today, to: today };
    if (datePreset === 'yesterday') {
      const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];
      return { from: yesterday, to: yesterday };
    }
    if (datePreset === 'last30') return { from: subDays(new Date(), 30).toISOString().split('T')[0], to: today };
    return { from: customDateFrom, to: customDateTo };
  }, [datePreset, today, customDateFrom, customDateTo]);
  
  // Fetch leads for current user - fetch ALL leads (no date filter at query level for Total tab)
  const { data: allLeads = [], isLoading } = useLeads({ 
    team: 'CALLING', 
    assignedTo: profile?.id,
  });
  
  // Collect order IDs from leads with orders to fetch order items
  const orderIds = useMemo(() => {
    return allLeads
      .filter(lead => lead.order_id)
      .map(lead => lead.order_id as string);
  }, [allLeads]);
  
  // Fetch order items for all leads with orders
  const { data: orderItemsMap = {} } = useOrderItemsByOrderIds(orderIds);
  
  // Helper function to get product names for a lead
  const getProductNames = useCallback((lead: Lead) => {
    if (lead.order_id && orderItemsMap[lead.order_id]?.length > 0) {
      return orderItemsMap[lead.order_id].map(item => item.product_name).join(', ');
    }
    return lead.products?.name || '-';
  }, [orderItemsMap]);
  
  // Determine if search is active (global search mode)
  const isSearchActive = searchQuery.trim().length > 0;

  // Filter leads based on filters
  const leads = useMemo(() => {
    const filtered = allLeads.filter(lead => {
      // Date filtering - SKIP if search is active (global search) or followup filter is active
      let matchesDate = true;
      
      if (isSearchActive) {
        // Global search: bypass date filtering
        matchesDate = true;
      } else if (followupFilter !== 'ALL') {
        // Skip date filtering for followup filters
        matchesDate = true;
      } else if (!(datePreset === 'custom' && !customDateFrom && !customDateTo)) {
        matchesDate = lead.date >= dateRange.from && lead.date <= dateRange.to;
      }
      
      const matchesProduct = productFilter === 'ALL' || lead.product_id === productFilter;
      
      // Handle special filters: REMAINING and DUPLICATE
      let matchesStatus = false;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (statusFilter === 'REMAINING') {
        matchesStatus = (lead.status === 'NEW' || lead.status === 'ASSIGNED') && 
                       lead.current_team === 'CALLING';
      } else if (statusFilter === 'DUPLICATE') {
        matchesStatus = lead.is_duplicate === true;
      } else {
        matchesStatus = lead.status === statusFilter;
      }
      
      // Search filter
      const searchTerm = searchQuery.toLowerCase().trim();
      const isRefIdSearch = isReferenceIdSearch(searchTerm);
      const matchesRefId = isRefIdSearch && matchesReferenceId(lead.reference_id, searchTerm);
      
      const matchesSearch = !searchTerm || 
        matchesRefId ||
        lead.client_name.toLowerCase().includes(searchTerm) ||
        lead.contact_number.includes(searchTerm) ||
        (lead.alt_phone && lead.alt_phone.includes(searchTerm)) ||
        (lead.products?.name && lead.products.name.toLowerCase().includes(searchTerm)) ||
        (lead.full_address && lead.full_address.toLowerCase().includes(searchTerm)) ||
        (lead.reference_id && lead.reference_id.toLowerCase().includes(searchTerm));
      
      // Follow-up filtering
      let matchesFollowup = true;
      if (followupFilter !== 'ALL' && lead.status === 'FOLLOW_UP') {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const followupTime = lead.next_followup_at ? new Date(lead.next_followup_at) : null;
        
        switch (followupFilter) {
          case 'today':
            matchesFollowup = followupTime ? followupTime.toISOString().split('T')[0] === todayStr : false;
            break;
          case 'upcoming':
            matchesFollowup = followupTime ? followupTime > now : false;
            break;
          case 'pending':
            matchesFollowup = followupTime ? followupTime <= now && !lead.followup_completed : false;
            break;
          case 'overdue':
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            matchesFollowup = followupTime ? followupTime < oneHourAgo && !lead.followup_completed : false;
            break;
        }
      } else if (followupFilter !== 'ALL' && lead.status !== 'FOLLOW_UP') {
        matchesFollowup = false;
      }
      
      return matchesDate && matchesProduct && matchesStatus && matchesSearch && matchesFollowup;
    });
    
    // Sort: bring due/overdue follow-ups to top, then by created_at descending
    return filtered.sort((a, b) => {
      const now = new Date();
      
      const aDue = a.status === 'FOLLOW_UP' && a.next_followup_at && new Date(a.next_followup_at) <= now && !a.followup_completed;
      const bDue = b.status === 'FOLLOW_UP' && b.next_followup_at && new Date(b.next_followup_at) <= now && !b.followup_completed;
      
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      
      const dateA = new Date(a.created_at || a.date).getTime();
      const dateB = new Date(b.created_at || b.date).getTime();
      return dateB - dateA;
    });
  }, [allLeads, dateRange, datePreset, customDateFrom, customDateTo, productFilter, statusFilter, searchQuery, followupFilter, isSearchActive]);
  
  // Pending calls count
  const pendingCallsCount = useMemo(() => {
    return allLeads.filter(l => 
      (l.status === 'NEW' || l.status === 'ASSIGNED') && 
      l.current_team === 'CALLING'
    ).length;
  }, [allLeads]);
  
  // Separate pending calls for dedicated section
  const pendingCalls = useMemo(() => {
    return leads.filter(l => l.status === 'NEW' || l.status === 'ASSIGNED');
  }, [leads]);
  
  const completedCalls = useMemo(() => {
    return leads.filter(l => l.status !== 'NEW' && l.status !== 'ASSIGNED');
  }, [leads]);
  
  // Call logs to check for new leads
  const { data: calledLeadIds = [] } = useCallLogsByUser(profile?.id);
  
  const { data: products = [] } = useProducts();
  
  const updateLead = useUpdateLead();
  const updateLeadStatus = useUpdateLeadStatus();
  const createOrder = useCreateOrder();
  const createCallLog = useCreateCallLog();
  const updateOrderItems = useUpdateOrderItems();
  const transferToFollowup = useTransferToFollowup();
  const transferToLeads = useTransferToLeads();
  const markAsCNR = useMarkAsCNR();

  // Transfer to Leads dialog state
  const [transferLeadDialogOpen, setTransferLeadDialogOpen] = useState(false);
  const [transferLeadTarget, setTransferLeadTarget] = useState<Lead | null>(null);
  const [transferReason, setTransferReason] = useState<TransferReason | ''>('');
  const [transferNotes, setTransferNotes] = useState('');

  // Add Lead dialog state
  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Sheet state for editing
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

  // Call timer state
  const [activeCall, setActiveCall] = useState<{ lead: Lead; startTime: Date } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState('');

  // Call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startCall = useCallback((lead: Lead, phone: string) => {
    setActiveCall({ lead, startTime: new Date() });
    setCallDuration(0);
    setCallNotes('');
    window.open(`tel:${phone}`, '_self');
  }, []);

  const endCall = useCallback(async (outcome?: string) => {
    if (!activeCall) return;
    
    try {
      await createCallLog.mutateAsync({
        leadId: activeCall.lead.id,
        outcome: outcome || 'Called',
        notes: callNotes ? `Duration: ${formatDuration(callDuration)} - ${callNotes}` : `Duration: ${formatDuration(callDuration)}`,
      });
      toast.success(`Call ended - Duration: ${formatDuration(callDuration)}`);
    } catch (error) {
      console.error('Failed to log call:', error);
    }
    
    setActiveCall(null);
    setCallDuration(0);
    setCallNotes('');
  }, [activeCall, callDuration, callNotes, createCallLog, formatDuration]);
  
  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('calling-leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Handle leadId URL param to open edit sheet
  useEffect(() => {
    if (leadIdParam && allLeads.length > 0 && !leadIdProcessed && !isLoading) {
      const leadToEdit = allLeads.find(l => l.id === leadIdParam);
      if (leadToEdit) {
        // Set date preset to last30 to show the lead regardless of date
        setDatePreset('last30');
        openEditSheet(leadToEdit);
        setLeadIdProcessed(true);
        // Clear URL param
        setSearchParams({}, { replace: true });
      } else {
        toast.error('Lead not found or not assigned to you');
        setSearchParams({}, { replace: true });
        setLeadIdProcessed(true);
      }
    }
  }, [leadIdParam, allLeads, isLoading, leadIdProcessed, setSearchParams]);

  const openWhatsApp = (lead: Lead) => {
    const product = products.find(p => p.id === lead.product_id);
    const message = encodeURIComponent(`Namaste ${lead.client_name}, I am calling from Vakari regarding your inquiry about ${product?.name || 'our product'}.`);
    window.open(`https://wa.me/${lead.contact_number.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCopyOrder = async (lead: Lead) => {
    if (lead.status !== 'CONFIRMED') {
      toast.error('Only confirmed orders can be copied');
      return;
    }

    try {
      // Fetch order data for this lead
      const { data: order, error } = await supabase
        .from('orders')
        .select('*, products(name)')
        .eq('lead_id', lead.id)
        .maybeSingle();

      if (error) throw error;

      if (!order) {
        toast.error('Order details not found for this lead.');
        return;
      }

      const product = products.find(p => p.id === lead.product_id);
      const altPhonePart = lead.alt_phone ? ` / Alt: ${lead.alt_phone}` : '';
      const branchName = lead.branches?.branch_name || lead.destination_branch || 'N/A';
      const deliveryType = order.delivery_location === 'INSIDE_VALLEY' ? 'Inside Valley' : 'Outside Valley';

      const orderMessage = `Zivkart – ${deliveryType} Delivery Order

Customer: ${lead.client_name}
Phone: ${lead.contact_number}${altPhonePart}
Location: ${branchName}
Address: ${lead.full_address || 'N/A'}

Product: ${product?.name || order.products?.name || 'N/A'}
Qty: ${order.quantity || 1}
Amount: Rs.${order.amount || 0} (COD)

Order By: ${profile?.name || 'N/A'}`;

      await navigator.clipboard.writeText(orderMessage);
      toast.success('Order details copied. Paste it in WhatsApp or SMS to send to rider.');
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to get order details');
    }
  };

  const handleCallWithTimer = (lead: Lead, phone: string) => {
    startCall(lead, phone);
  };

  const openEditSheet = async (lead: Lead) => {
    const product = products.find(p => p.id === lead.product_id);
    setEditingLead(lead);
    
    // If lead has an existing order, fetch its details
    let orderItems = product 
      ? [{ id: crypto.randomUUID(), product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.sell_price || 0, discount: 0 }] 
      : [{ id: crypto.randomUUID(), product_id: '', product_name: '', quantity: 1, unit_price: 0, discount: 0 }];
    let deliveryLocation = '';
    let isCod = true;

    if (lead.order_id) {
      // Fetch existing order and its items
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
  };

  const handleSave = async () => {
    if (!editingLead) return;

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

      // Only create order if lead doesn't already have one (prevent duplicates)
      if (editForm.status === 'CONFIRMED' && !editingLead.order_id) {
        // Validate delivery_location is required for confirmed orders
        if (!editForm.delivery_location) {
          toast.error('Please select a delivery location (Inside/Outside Valley) before confirming');
          return;
        }

        // Validate at least one product is selected
        const validItems = (editForm.orderItems || []).filter(item => item.product_id);
        if (validItems.length === 0) {
          toast.error('Please add at least one product to the order');
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
        // Update existing order with new details
        const validItems = (editForm.orderItems || []).filter(item => item.product_id);
        const grandTotal = validItems.reduce((sum, item) => {
          const subtotal = item.quantity * item.unit_price;
          return sum + Math.max(0, subtotal - (item.discount || 0));
        }, 0);
        const totalQty = validItems.reduce((sum, item) => sum + item.quantity, 0);

        // Update the order
        const { error: orderUpdateError } = await supabase.from('orders').update({
          destination_branch: editForm.destination_branch || undefined,
          branch_id: editForm.branch_id || undefined,
          full_address: editForm.full_address || undefined,
          delivery_location: editForm.delivery_location || undefined,
          is_cod: editForm.is_cod,
          quantity: totalQty || 1,
          amount: grandTotal || undefined,
          product_id: validItems[0]?.product_id || undefined,
        }).eq('id', editingLead.order_id);

        if (orderUpdateError) {
          console.error('Order update error:', orderUpdateError);
          toast.error('Failed to update order');
          return;
        }

        // Use the hook to update order items - it handles delete + insert properly
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

        toast.success('Lead and order updated successfully');
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
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransferToFollowup = async (lead: Lead) => {
    if (lead.status === 'CONFIRMED') {
      toast.error('Cannot transfer confirmed orders');
      return;
    }
    await transferToFollowup.mutateAsync(lead.id);
  };

  const openTransferToLeadsDialog = (lead: Lead) => {
    setTransferLeadTarget(lead);
    setTransferReason('');
    setTransferNotes('');
    setTransferLeadDialogOpen(true);
  };

  const handleTransferToLeads = async () => {
    if (!transferLeadTarget || !transferReason) {
      toast.error('Please select a transfer reason');
      return;
    }
    
    try {
      await transferToLeads.mutateAsync({
        leadId: transferLeadTarget.id,
        reason: transferReason,
        notes: transferNotes || undefined,
      });
      setTransferLeadDialogOpen(false);
      setTransferLeadTarget(null);
    } catch (error) {
      console.error(error);
    }
  };

  const isNewLead = (lead: Lead) => {
    return (lead.status === 'NEW' || lead.status === 'ASSIGNED') && !calledLeadIds.includes(lead.id);
  };

  // Allow transfer to Follow-up for any lead status (except already confirmed orders)
  const canTransferToFollowup = (lead: Lead) => {
    return lead.status !== 'CONFIRMED';
  };

  // Export leads to CSV
  const exportLeadsCSV = () => {
    const headers = ['Date', 'Customer', 'Phone', 'Alt Phone', 'Product', 'Branch', 'Address', 'Status', 'Remark', 'Source', 'Reference Id'];
    const rows = leads.map(l => [
      l.date,
      l.client_name,
      l.contact_number,
      l.alt_phone || '',
      l.products?.name || '',
      l.branches?.branch_name || l.destination_branch || '',
      l.full_address || '',
      l.status,
      l.remark || '',
      l.source || '',
      l.id,
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-leads-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
  };

  // Reset all filters
  const handleReset = () => {
    setSearchQuery('');
    setProductFilter('ALL');
    setStatusFilter('ALL');
    setFollowupFilter('ALL');
    setDatePreset('today');
    setCustomDateFrom(today);
    setCustomDateTo(today);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Leads</h1>
          <p className="text-muted-foreground">Manage your assigned leads</p>
        </div>
        <div className="flex items-center gap-3">
          <AddLeadDropdown
            onAddLead={() => setAddLeadDialogOpen(true)}
            onImport={() => setImportDialogOpen(true)}
          />
          <Badge variant="outline" className="text-sm bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)] border-[hsl(25,95%,53%)]/20">
            <Phone className="w-4 h-4 mr-1" />
            {pendingCallsCount} Pending Calls
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            {leads.length} Leads
          </Badge>
        </div>
      </div>

      {/* Add Lead Dialog */}
      <AddLeadDialog open={addLeadDialogOpen} onOpenChange={setAddLeadDialogOpen} />

      {/* Import Leads Dialog */}
      <ImportLeadsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} portalType="CALLING" />

      {/* Filters */}
      <LeadFiltersCard
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customDateFrom={customDateFrom}
        onCustomDateFromChange={setCustomDateFrom}
        customDateTo={customDateTo}
        onCustomDateToChange={setCustomDateTo}
        productFilter={productFilter}
        onProductFilterChange={setProductFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        products={products}
        onReset={handleReset}
        showFollowupFilter={true}
        followupFilter={followupFilter}
        onFollowupFilterChange={setFollowupFilter}
      />


      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header w-[60px] text-center sticky left-0 bg-background z-10">S.No</TableHead>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Customer</TableHead>
                  <TableHead className="table-header">Phone</TableHead>
                  <TableHead className="table-header">Alt Phone</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Address</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Remark</TableHead>
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead, index) => {
                  const isOverdue = lead.status === 'FOLLOW_UP' && 
                    lead.next_followup_at && 
                    new Date(lead.next_followup_at) < new Date() &&
                    !lead.followup_completed;
                  const isDue = lead.status === 'FOLLOW_UP' && 
                    lead.next_followup_at && 
                    new Date(lead.next_followup_at) <= new Date() &&
                    !lead.followup_completed;
                  
                  return (
                    <TableRow 
                      key={lead.id} 
                      className={`${isNewLead(lead) ? 'bg-primary/5' : ''} ${isOverdue ? 'border-l-4 border-l-destructive bg-destructive/5' : ''} ${isDue && !isOverdue ? 'border-l-4 border-l-info bg-info/5' : ''}`}
                    >
                    <TableCell className="w-[60px] text-center font-medium text-muted-foreground sticky left-0 bg-background z-10">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <FormattedDate date={lead.date} />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {lead.client_name}
                        {lead.is_duplicate ? (
                          <DuplicateBadge phone={lead.contact_number} isDuplicate={lead.is_duplicate} />
                        ) : isNewLead(lead) ? (
                          <Badge variant="default" className="text-xs bg-amber-500 text-white animate-pulse">
                            New
                          </Badge>
                        ) : null}
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                        {isDue && !isOverdue && (
                          <Badge variant="secondary" className="text-xs bg-info/20 text-info">
                            Call Now
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleCallWithTimer(lead, lead.contact_number)}
                        className="text-primary hover:underline"
                      >
                        {lead.contact_number}
                      </button>
                    </TableCell>
                    <TableCell>
                      {lead.alt_phone ? (
                        <button 
                          onClick={() => handleCallWithTimer(lead, lead.alt_phone!)}
                          className="text-primary hover:underline"
                        >
                          {lead.alt_phone}
                        </button>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={getProductNames(lead)}>
                      {getProductNames(lead)}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">
                      {lead.branches?.branch_name || lead.destination_branch || '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{lead.full_address || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={getLeadStatusBadgeClass(lead.status)}
                      >
                        {formatStatusLabel(lead.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{lead.remark || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSheet(lead)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCallWithTimer(lead, lead.contact_number)}
                          className="h-8 w-8 p-0 text-success hover:text-success"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openWhatsApp(lead)}
                          className="h-8 w-8 p-0 text-success hover:text-success"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        {/* Quick CNR Button */}
                        {(lead.status === 'NEW' || lead.status === 'ASSIGNED' || lead.status === 'IN_PROGRESS') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsCNR.mutate({ leadId: lead.id })}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Mark as CNR (Call Not Received)"
                            disabled={markAsCNR.isPending}
                          >
                            <PhoneOff className="w-4 h-4" />
                          </Button>
                        )}
                        {canTransferToFollowup(lead) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTransferToFollowup(lead)}
                            className="h-8 w-8 p-0 text-warning hover:text-warning"
                            title="Transfer to Follow-up"
                            disabled={transferToFollowup.isPending}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTransferToLeadsDialog(lead)}
                          className="h-8 w-8 p-0 text-info hover:text-info"
                          title="Transfer to Leads"
                        >
                          <CornerDownLeft className="w-4 h-4" />
                        </Button>
                        {lead.status === 'CONFIRMED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyOrder(lead)}
                            className="h-8 w-8 p-0 text-primary hover:text-primary"
                            title="Copy Order"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No leads match the filters'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Lead Sheet */}
      <EditLeadSheet
        lead={editingLead}
        formData={editForm}
        onFormChange={setEditForm}
        onSave={handleSave}
        onClose={() => setEditingLead(null)}
        onCall={handleCallWithTimer}
        onWhatsApp={openWhatsApp}
        isSaving={updateLead.isPending || createOrder.isPending}
      />

      {/* Call Timer Dialog */}
      <Dialog open={!!activeCall} onOpenChange={(open) => !open && endCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-success/10 rounded-full animate-pulse">
                <Phone className="w-5 h-5 text-success" />
              </div>
              Call in Progress
            </DialogTitle>
          </DialogHeader>
          
          {activeCall && (
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Calling</p>
                <p className="text-xl font-semibold">{activeCall.lead.client_name}</p>
                <p className="text-muted-foreground">{activeCall.lead.contact_number}</p>
                <p className="text-sm text-muted-foreground mt-2">{activeCall.lead.products?.name || '-'}</p>
                
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Timer className="w-6 h-6 text-primary" />
                  <span className="text-4xl font-mono font-bold text-primary">
                    {formatDuration(callDuration)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Notes</Label>
                <Textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes during the call..."
                  rows={2}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => endCall('FOLLOW_UP')}
                  className="flex-1"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  End - Follow Up
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => endCall('CALL_NOT_RECEIVED')}
                  className="flex-1"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End - CNR
                </Button>
                <Button 
                  onClick={() => endCall('Called')}
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer to Leads Dialog */}
      <Dialog open={transferLeadDialogOpen} onOpenChange={setTransferLeadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CornerDownLeft className="w-5 h-5 text-info" />
              Transfer to Leads
            </DialogTitle>
          </DialogHeader>
          
          {transferLeadTarget && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{transferLeadTarget.client_name}</p>
                <p className="text-sm text-muted-foreground">{transferLeadTarget.contact_number}</p>
                <p className="text-sm text-muted-foreground">{transferLeadTarget.products?.name || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>Transfer Reason *</Label>
                <Select value={transferReason} onValueChange={(v) => setTransferReason(v as TransferReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOLLOWUP">Follow Up</SelectItem>
                    <SelectItem value="CNR">Call Not Received (CNR)</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Add notes about this transfer..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setTransferLeadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleTransferToLeads}
                  disabled={!transferReason || transferToLeads.isPending}
                >
                  Transfer Lead
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}