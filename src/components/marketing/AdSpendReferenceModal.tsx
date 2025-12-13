import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Save, X, Edit2, Check, ChevronsUpDown } from 'lucide-react';
import { useAdSpendReference, useUpsertAdSpendReference, useDeleteAdSpendReference } from '@/hooks/useAdSpendReference';
import { useProducts } from '@/hooks/useProducts';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { cn } from '@/lib/utils';

interface AdSpendReferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdSpendReferenceModal({ open, onOpenChange }: AdSpendReferenceModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newProductId, setNewProductId] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [productOpen, setProductOpen] = useState(false);

  const { effectiveRole } = useEffectiveRole();
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER';
  const isMarketing = effectiveRole === 'MARKETING';

  // Calculate editable date range based on role
  const minEditableDate = useMemo(() => {
    if (isAdmin) return undefined;
    if (isMarketing) return subDays(new Date(), 7);
    return new Date();
  }, [isAdmin, isMarketing]);

  // Fetch all reference spend data (no date filter, sorted by product spend)
  const { data: spendData, isLoading } = useAdSpendReference();
  const { data: products } = useProducts();
  const upsertMutation = useUpsertAdSpendReference();
  const deleteMutation = useDeleteAdSpendReference();

  // Sort products by total spend (highest first)
  const sortedSpendData = useMemo(() => {
    if (!spendData) return [];
    
    // Group by product and sum amounts
    const productSpendMap = new Map<string, number>();
    spendData.forEach(item => {
      const current = productSpendMap.get(item.product_id) || 0;
      productSpendMap.set(item.product_id, current + item.amount);
    });
    
    // Sort by total spend descending
    return [...spendData].sort((a, b) => {
      const aTotal = productSpendMap.get(a.product_id) || 0;
      const bTotal = productSpendMap.get(b.product_id) || 0;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return new Date(b.spend_date).getTime() - new Date(a.spend_date).getTime();
    });
  }, [spendData]);

  const canEditRow = (spendDate: string) => {
    if (isAdmin) return true;
    if (!minEditableDate) return false;
    const rowDate = new Date(spendDate);
    return rowDate >= minEditableDate;
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const handleSaveEdit = async (item: any) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;

    await upsertMutation.mutateAsync({
      product_id: item.product_id,
      spend_date: item.spend_date,
      amount,
      notes: item.notes,
    });
    handleCancelEdit();
  };

  const handleAddNew = async () => {
    if (!newProductId) return;
    const amount = parseFloat(newAmount) || 0;
    if (amount < 0) return;

    await upsertMutation.mutateAsync({
      product_id: newProductId,
      spend_date: today,
      amount,
      notes: null,
    });

    setShowAddRow(false);
    setNewProductId('');
    setNewAmount('');
  };

  const selectedProduct = products?.find(p => p.id === newProductId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ad Spend Reference</DialogTitle>
        </DialogHeader>

        {/* Add New Row */}
        <div className="flex items-center gap-2 mb-4">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowAddRow(!showAddRow)} 
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        {showAddRow && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/50">
            <div className="grid grid-cols-4 gap-3 items-end">
              {/* Product Name - Searchable Combobox */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Product Name</label>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productOpen}
                      className="w-full justify-between"
                    >
                      {selectedProduct?.name || "Select product..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {products?.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setNewProductId(product.id);
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newProductId === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type - Auto Daily */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Type</label>
                <Input value="Daily" disabled className="bg-muted" />
              </div>

              {/* Ad Spend */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Ad Spend (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleAddNew} disabled={!newProductId || upsertMutation.isPending} size="sm">
                  {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddRow(false); setNewProductId(''); setNewAmount(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Spend (₹)</TableHead>
                <TableHead className="w-24">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sortedSpendData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No ad spend entries found. Click "Add Row" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                sortedSpendData.map((item) => {
                  const isEditing = editingId === item.id;
                  const canEdit = canEditRow(item.spend_date);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">Daily</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-28 ml-auto"
                            autoFocus
                          />
                        ) : (
                          `₹${item.amount.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEdit(item)}
                              disabled={upsertMutation.isPending}
                            >
                              <Save className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : canEdit ? (
                          <Button size="icon" variant="ghost" onClick={() => handleStartEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          {isAdmin ? 'Admin: Can edit any date' : isMarketing ? 'Marketing: Can edit last 7 days' : 'View only'}
          {' • '}Products sorted by highest spend first
        </div>
      </DialogContent>
    </Dialog>
  );
}
