import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { notifyLeadTransfer } from '@/lib/notificationHelpers';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useAuth } from '@/contexts/AuthContext';

interface AdminTransferLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadType = 'NEW' | 'FOLLOW_UP_POOL' | 'CNR_POOL';

interface ProductLeadCount {
  productId: string;
  productName: string;
  availableCount: number;
}

interface StaffWithTodayCount {
  id: string;
  name: string;
  email: string;
  todayAssigned: number;
}

export function AdminTransferLeadsModal({ 
  open, 
  onOpenChange,
}: AdminTransferLeadsModalProps) {
  const { currentStore } = useCurrentStore();
  const { profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MANAGER' || profile?.role === 'SALES_MANAGER';
  const isLeadsRole = profile?.role === 'LEADS';
  const canSeeAllLeads = isOwner || isAdmin; // Admin/Owner sees ALL leads, LEADS role sees only their created leads
  const queryClient = useQueryClient();
  
  const [leadType, setLeadType] = useState<LeadType>('NEW');
  const [productId, setProductId] = useState<string>('');
  const [staffId, setStaffId] = useState<string>('');
  const [count, setCount] = useState<number>(10);
  const [isTransferring, setIsTransferring] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [staffSearchOpen, setStaffSearchOpen] = useState(false);
  const [inputError, setInputError] = useState<string>('');

  // Fetch available leads grouped by product for the selected lead type
  // LEADS role only sees leads they created; Admin/Owner sees ALL leads
  const { data: productLeadCounts = [], refetch: refetchProductCounts } = useQuery({
    queryKey: ['product-lead-counts', leadType, open, profile?.id, isOwner, isLeadsRole, canSeeAllLeads, currentStore?.id],
    queryFn: async () => {
      if (!open || !profile?.id) return [];
      
      // Use currentStore.id for OWNER, or get user's store for non-OWNER
      let storeId: string | null = currentStore?.id || null;
      if (!canSeeAllLeads && !storeId) {
        const { data: userStoreAccess } = await supabase
          .from('user_store_access')
          .select('store_id')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .single();
        
        storeId = userStoreAccess?.store_id || null;
      }
      
      if (!storeId) return [];
      
      // Get all unassigned leads for this lead type filtered by store (exclude confirmed leads)
      let query = supabase
        .from('leads')
        .select('product_id, created_by_user_id, products!inner(id, name, store_id)')
        .eq('lead_bucket', leadType)
        .eq('pool_status', 'IN_POOL')
        .is('assigned_to_user_id', null)
        .neq('status', 'CONFIRMED')
        .is('order_id', null)
        .eq('store_id', storeId)
        .eq('products.store_id', storeId);
      
      // LEADS role: only see leads they created
      if (isLeadsRole && !canSeeAllLeads) {
        query = query.eq('created_by_user_id', profile.id);
      }
      
      const { data: leads, error } = await query;

      if (error) throw error;

      // Group by product and count
      const countMap = new Map<string, { productId: string; productName: string; count: number }>();
      
      leads?.forEach((lead: any) => {
        if (lead.product_id && lead.products) {
          const existing = countMap.get(lead.product_id);
          if (existing) {
            existing.count++;
          } else {
            countMap.set(lead.product_id, {
              productId: lead.product_id,
              productName: lead.products.name,
              count: 1
            });
          }
        }
      });

      return Array.from(countMap.values())
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          availableCount: item.count
        }))
        .sort((a, b) => b.availableCount - a.availableCount);
    },
    enabled: open && !!profile?.id,
  });

  // Fetch today's assigned leads count per staff - directly fetch CALLING staff for current store
  const { data: staffWithCounts = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff-today-counts', open, profile?.id, isOwner, currentStore?.id],
    queryFn: async () => {
      if (!open || !profile?.id) return [];
      
      // Use currentStore.id for OWNER, or get user's store for non-OWNER
      let storeId: string | null = currentStore?.id || null;
      if (!storeId) {
        const { data: userStoreAccess } = await supabase
          .from('user_store_access')
          .select('store_id')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .maybeSingle();
        
        storeId = userStoreAccess?.store_id || null;
      }
      
      if (!storeId) return [];
      
      // Get all CALLING staff for the store
      const { data: storeUsers, error: storeError } = await supabase
        .from('user_store_access')
        .select('user_id')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (storeError) throw storeError;
      
      let callingStaff: { id: string; name: string; email: string }[] = [];
      if (storeUsers && storeUsers.length > 0) {
        const userIds = storeUsers.map(u => u.user_id);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds)
          .eq('role', 'CALLING')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        callingStaff = data || [];
      }
      
      console.log('Final callingStaff count:', callingStaff.length);
      if (callingStaff.length === 0) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's assigned leads per staff filtered by store
      const { data: assignments, error } = await supabase
        .from('leads')
        .select('assigned_to_user_id')
        .eq('store_id', storeId)
        .gte('assigned_at', `${today}T00:00:00`)
        .lte('assigned_at', `${today}T23:59:59`)
        .not('assigned_to_user_id', 'is', null);

      if (error) throw error;

      // Count per staff
      const countMap = new Map<string, number>();
      assignments?.forEach((lead: any) => {
        if (lead.assigned_to_user_id) {
          countMap.set(lead.assigned_to_user_id, (countMap.get(lead.assigned_to_user_id) || 0) + 1);
        }
      });

      return callingStaff.map(staff => ({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        todayAssigned: countMap.get(staff.id) || 0
      }));
    },
    enabled: open && !!profile?.id,
  });

  // Calculate total available leads for selected type
  const totalAvailable = useMemo(() => {
    return productLeadCounts.reduce((sum, p) => sum + p.availableCount, 0);
  }, [productLeadCounts]);

  // Get available count for selected product
  const selectedProductCount = useMemo(() => {
    if (!productId) return 0;
    const product = productLeadCounts.find(p => p.productId === productId);
    return product?.availableCount || 0;
  }, [productId, productLeadCounts]);

  // Reset form when lead type changes
  useEffect(() => {
    setProductId('');
    setStaffId('');
    setCount(10);
    setInputError('');
  }, [leadType]);

  // Update count when product changes
  useEffect(() => {
    if (selectedProductCount > 0) {
      setCount(Math.min(10, selectedProductCount));
      setInputError('');
    }
  }, [selectedProductCount]);

  // Validate count input
  useEffect(() => {
    if (count <= 0) {
      setInputError('Please enter at least 1 lead');
    } else if (count > selectedProductCount && selectedProductCount > 0) {
      setInputError(`You only have ${selectedProductCount} leads available for this product`);
    } else {
      setInputError('');
    }
  }, [count, selectedProductCount]);

  const handleTransfer = async () => {
    if (!leadType) {
      toast.error('Please select lead type');
      return;
    }
    if (!productId) {
      toast.error('Please select a product');
      return;
    }
    if (!staffId) {
      toast.error('Please select a staff member');
      return;
    }
    if (count <= 0 || count > selectedProductCount) {
      toast.error(inputError || 'Invalid number of leads');
      return;
    }

    setIsTransferring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get store_id for filtering
      let storeId: string | null = currentStore?.id || null;
      if (!canSeeAllLeads && !storeId) {
        const { data: userStoreAccess } = await supabase
          .from('user_store_access')
          .select('store_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        storeId = userStoreAccess?.store_id || null;
      }
      
      if (!storeId) {
        throw new Error('Store context not available');
      }

      // Get names for toast message
      const selectedProduct = productLeadCounts.find(p => p.productId === productId);
      const selectedStaff = staffWithCounts.find(s => s.id === staffId);
      const productName = selectedProduct?.productName || 'Unknown';
      const staffName = selectedStaff?.name || 'Unknown';

      // Get available leads filtered by store (exclude confirmed leads - cannot be transferred)
      // LEADS role: only transfer leads they created
      let leadsQuery = supabase
        .from('leads')
        .select('id, store_id')
        .eq('product_id', productId)
        .eq('lead_bucket', leadType)
        .eq('pool_status', 'IN_POOL')
        .eq('store_id', storeId)
        .is('assigned_to_user_id', null)
        .neq('status', 'CONFIRMED')
        .is('order_id', null)
        .order('created_at', { ascending: true })
        .limit(count);
      
      // LEADS role: filter by created_by_user_id
      if (isLeadsRole && !canSeeAllLeads) {
        leadsQuery = leadsQuery.eq('created_by_user_id', user.id);
      }
      
      const { data: leads, error: fetchError } = await leadsQuery;

      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) {
        throw new Error('No leads available for transfer');
      }

      const leadIds = leads.map(l => l.id);
      const notificationStoreId = leads[0]?.store_id;

      // Update leads
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_to_user_id: staffId,
          status: 'ASSIGNED',
          current_team: 'CALLING',
          pool_status: 'ASSIGNED',
          assigned_at: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0], // Set today's date when reassigning
        })
        .in('id', leadIds);

      if (updateError) throw updateError;

      // Create transfer records for Staff Transfer Summary tracking (include store_id and lead_type for unified counting)
      const transferRecords = leadIds.map(leadId => ({
        lead_id: leadId,
        from_user_id: null,
        to_user_id: staffId,
        transferred_by_user_id: user.id,
        transferred_at: new Date().toISOString(),
        store_id: storeId,
        lead_type: leadType, // Track if NEW, FOLLOW_UP_POOL, or CNR_POOL
      }));
      await supabase.from('lead_transfers').insert(transferRecords);

      // Create history records
      const historyRecords = leadIds.map(leadId => ({
        lead_id: leadId,
        to_staff_id: staffId,
        transferred_by: user.id,
        action: 'TRANSFER',
        notes: `Transferred ${leadType === 'NEW' ? 'new' : leadType === 'FOLLOW_UP_POOL' ? 'follow-up' : 'CNR'} lead for ${productName} to ${staffName}`,
      }));

      await supabase.from('lead_history').insert(historyRecords);

      // Send real-time notification to the assigned staff
      try {
        await notifyLeadTransfer({
          count: leadIds.length,
          productName,
          targetUserId: staffId,
          targetUserName: staffName,
          actorId: user.id,
          actorName: 'Admin',
          storeId: notificationStoreId || undefined,
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      const leadTypeLabel = leadType === 'NEW' ? 'New' : leadType === 'FOLLOW_UP_POOL' ? 'Follow-up' : 'CNR';
      toast.success(`Successfully transferred ${leadIds.length} ${leadTypeLabel} leads of ${productName} to ${staffName}`);
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      // Refresh product counts
      await refetchProductCounts();
      
      // Reset selection but stay in modal if more leads available
      setProductId('');
      setStaffId('');
      setCount(10);
      
      // Close modal if no more leads available
      const remainingCount = totalAvailable - leadIds.length;
      if (remainingCount <= 0) {
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      toast.error(`Failed to transfer leads: ${error.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const resetForm = () => {
    setLeadType('NEW');
    setProductId('');
    setStaffId('');
    setCount(10);
    setInputError('');
  };

  const selectedProduct = productLeadCounts.find(p => p.productId === productId);
  const selectedStaff = staffWithCounts.find(s => s.id === staffId);
  const hasProductsAvailable = productLeadCounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer Leads</DialogTitle>
          <DialogDescription>
            Select lead type, product, and staff to transfer leads
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Loading State */}
          {isStaffLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading staff data...</span>
            </div>
          ) : (
          <>
          {/* Lead Type Selection */}
          <div className="space-y-2">
            <Label>Lead Type *</Label>
            <Select value={leadType} onValueChange={(value: LeadType) => setLeadType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New Leads</SelectItem>
                <SelectItem value="FOLLOW_UP_POOL">Follow-up Leads</SelectItem>
                <SelectItem value="CNR_POOL">CNR Leads</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only products with available {leadType === 'NEW' ? 'new' : leadType === 'FOLLOW_UP_POOL' ? 'follow-up' : 'CNR'} leads will be shown
            </p>
          </div>

          {/* Summary Info */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="text-sm">
              <span className="font-medium">
                {leadType === 'NEW' ? 'New Leads' : leadType === 'FOLLOW_UP_POOL' ? 'Follow-up Leads' : 'CNR Leads'}:
              </span>{' '}
              <span className="text-muted-foreground">
                {totalAvailable} lead{totalAvailable !== 1 ? 's' : ''} available across {productLeadCounts.length} product{productLeadCounts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Select Product *</Label>
            {!hasProductsAvailable ? (
              <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm">
                  No leads available for {leadType === 'NEW' ? 'new' : leadType === 'FOLLOW_UP_POOL' ? 'follow-up' : 'CNR'} lead type
                </AlertDescription>
              </Alert>
            ) : (
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedProduct ? (
                      <span>
                        {selectedProduct.productName}
                        <Badge variant="secondary" className="ml-2">
                          {selectedProduct.availableCount} leads
                        </Badge>
                      </span>
                    ) : (
                      "Select product..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {productLeadCounts.map((product) => (
                        <CommandItem
                          key={product.productId}
                          value={product.productName}
                          onSelect={() => {
                            setProductId(product.productId);
                            setProductSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productId === product.productId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center justify-between w-full">
                            <span>{product.productName}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {product.availableCount} available
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {productId && selectedProductCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Available leads for this product: <span className="font-medium text-foreground">{selectedProductCount}</span>
              </p>
            )}
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label>Select Staff *</Label>
            <Popover open={staffSearchOpen} onOpenChange={setStaffSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={staffSearchOpen}
                  className="w-full justify-between"
                  disabled={!hasProductsAvailable}
                >
                  {selectedStaff ? (
                    <span className="flex items-center gap-2">
                      {selectedStaff.name}
                      {selectedStaff.todayAssigned > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedStaff.todayAssigned} today
                        </Badge>
                      )}
                    </span>
                  ) : (
                    "Select staff..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search staff..." />
                  <CommandEmpty>No staff found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {staffWithCounts.map((staff) => (
                      <CommandItem
                        key={staff.id}
                        value={`${staff.name} ${staff.email}`}
                        onSelect={() => {
                          setStaffId(staff.id);
                          setStaffSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            staffId === staff.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span className="font-medium">{staff.name}</span>
                            <span className="text-xs text-muted-foreground">{staff.email}</span>
                          </div>
                          {staff.todayAssigned > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {staff.todayAssigned} leads today
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Number of Leads */}
          <div className="space-y-2">
            <Label htmlFor="count">Number of Leads *</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={selectedProductCount || undefined}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              disabled={!productId || !hasProductsAvailable}
              className={inputError ? 'border-destructive' : ''}
            />
            {inputError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {inputError}
              </p>
            )}
            {!inputError && productId && selectedProductCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Max: {selectedProductCount} lead{selectedProductCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={
              isTransferring || 
              !leadType || 
              !productId || 
              !staffId || 
              count <= 0 || 
              !!inputError ||
              !hasProductsAvailable
            }
          >
            {isTransferring ? 'Transferring...' : 'Transfer Leads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
