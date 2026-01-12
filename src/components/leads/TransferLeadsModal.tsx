import { useState, useMemo } from 'react';
import { useTransferLeads, Lead } from '@/hooks/useLeads';
import { useProducts } from '@/hooks/useProducts';
import { useCallingStaff } from '@/hooks/useStaff';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeadBucketOption = 'NEW' | 'FOLLOW_UP_POOL' | 'CNR_POOL';

interface TransferLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadsInPool: Lead[];
}

export function TransferLeadsModal({ open, onOpenChange, leadsInPool }: TransferLeadsModalProps) {
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useCallingStaff();
  const transferLeads = useTransferLeads();

  const [leadBucket, setLeadBucket] = useState<LeadBucketOption>('NEW');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [count, setCount] = useState<string>('10');
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  // Calculate counts for each lead type based on pool_status = IN_POOL
  const newLeads = leadsInPool.filter(l => l.lead_bucket === 'NEW' && l.pool_status === 'IN_POOL');
  const followupLeads = leadsInPool.filter(l => l.lead_bucket === 'FOLLOW_UP_POOL' && l.pool_status === 'IN_POOL');
  const cnrLeads = leadsInPool.filter(l => l.lead_bucket === 'CNR_POOL' && l.pool_status === 'IN_POOL');

  // Calculate available leads per product for selected bucket
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let bucketLeads: Lead[];
    
    if (leadBucket === 'NEW') {
      bucketLeads = newLeads;
    } else if (leadBucket === 'FOLLOW_UP_POOL') {
      bucketLeads = followupLeads;
    } else {
      bucketLeads = cnrLeads;
    }
    
    products.forEach(p => {
      counts[p.id] = bucketLeads.filter(l => l.product_id === p.id).length;
    });
    
    return counts;
  }, [products, newLeads, followupLeads, cnrLeads, leadBucket]);

  const availableForSelectedProduct = selectedProductId ? productCounts[selectedProductId] || 0 : 0;
  const maxCount = Math.min(100, availableForSelectedProduct);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId || !selectedStaffId) return;
    
    const transferCount = Math.min(parseInt(count) || 1, maxCount);
    if (transferCount <= 0) return;

    await transferLeads.mutateAsync({
      productId: selectedProductId,
      staffId: selectedStaffId,
      count: transferCount,
      leadBucket,
    });

    onOpenChange(false);
    setSelectedProductId('');
    setSelectedStaffId('');
    setCount('10');
    setLeadBucket('NEW');
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Leads to Calling Staff</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="space-y-2">
            <Label>Lead Type</Label>
            <Select value={leadBucket} onValueChange={(v) => {
              setLeadBucket(v as LeadBucketOption);
              setSelectedProductId(''); // Reset product when type changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose lead type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New Leads ({newLeads.length} available)</SelectItem>
                <SelectItem value="FOLLOW_UP_POOL">Follow-up Leads ({followupLeads.length} available)</SelectItem>
                <SelectItem value="CNR_POOL">CNR Leads ({cnrLeads.length} available)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Product</Label>
            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedProduct 
                    ? `${selectedProduct.name} (${productCounts[selectedProduct.id] || 0})`
                    : "Select product..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search products..." />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => {
                        const count = productCounts[product.id] || 0;
                        return (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => {
                              setSelectedProductId(product.id);
                              setProductSearchOpen(false);
                            }}
                            disabled={count === 0}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className={count === 0 ? 'text-muted-foreground' : ''}>
                              {product.name}
                            </span>
                            <span className={cn(
                              "ml-auto text-xs",
                              count === 0 ? 'text-muted-foreground' : 'text-primary font-medium'
                            )}>
                              ({count})
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Select Staff</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose staff member" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {callingStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Leads</Label>
            <Input
              type="number"
              min="1"
              max={maxCount || 100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            {selectedProductId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Available for this product: <span className="font-medium text-foreground">{availableForSelectedProduct}</span>
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={transferLeads.isPending || !selectedProductId || !selectedStaffId || availableForSelectedProduct === 0}
          >
            {transferLeads.isPending ? 'Transferring...' : 'Transfer Leads'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
