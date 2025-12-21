import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Save, X, Edit2, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { useAdSpendReference, useUpsertAdSpendReference, useDeleteAdSpendReference } from '@/hooks/useAdSpendReference';
import { useProducts } from '@/hooks/useProducts';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useDefaultUsdRate } from '@/hooks/useAds';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  const [newTarget, setNewTarget] = useState<string>('');
  const [editTarget, setEditTarget] = useState<string>('');
  const [productOpen, setProductOpen] = useState(false);

  const { effectiveRole } = useEffectiveRole();
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER';
  const isMarketing = effectiveRole === 'MARKETING';
  const canEditAds = isAdmin || isMarketing;
  const { data: usdRate = 133.5 } = useDefaultUsdRate();

  // Calculate editable date range based on role
  // Admin and Marketing can edit any date
  const minEditableDate = useMemo(() => {
    if (canEditAds) return undefined;
    return new Date();
  }, [canEditAds]);

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
    if (canEditAds) return true;
    if (!minEditableDate) return false;
    const rowDate = new Date(spendDate);
    return rowDate >= minEditableDate;
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditTarget(String(item.target_orders || 0));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditTarget('');
  };

  const handleSaveEdit = async (item: any) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;
    const target = parseInt(editTarget) || 0;

    await upsertMutation.mutateAsync({
      product_id: item.product_id,
      spend_date: item.spend_date,
      amount,
      target_orders: target,
      notes: item.notes,
    });
    handleCancelEdit();
  };

  const handleAddNew = async () => {
    if (!newProductId) return;
    const amount = parseFloat(newAmount) || 0;
    if (amount < 0) return;
    const target = parseInt(newTarget) || 0;

    await upsertMutation.mutateAsync({
      product_id: newProductId,
      spend_date: today,
      amount,
      target_orders: target,
      notes: null,
    });

    setShowAddRow(false);
    setNewProductId('');
    setNewAmount('');
    setNewTarget('');
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
            <div className="grid grid-cols-5 gap-3 items-end">
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

              {/* Ad Spend (USD) */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-1">
                  <Badge variant="outline" className="h-4 px-1 bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">$</Badge>
                  Spend (USD)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAmount(val);
                    // Auto-calculate target as 60% of spend
                    const amount = parseFloat(val) || 0;
                    setNewTarget(String(Math.round(amount * 0.6)));
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Target Orders (auto-calculated, editable) */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Target (60%)</label>
                <Input
                  type="number"
                  min="0"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Calculated NPR Amount */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-1">
                  <Badge variant="outline" className="h-4 px-1 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">₹</Badge>
                  Amount (NPR)
                </label>
                <Input
                  value={`₹${((parseFloat(newAmount) || 0) * usdRate).toLocaleString()}`}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleAddNew} disabled={!newProductId || upsertMutation.isPending} size="sm">
                  {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddRow(false); setNewProductId(''); setNewAmount(''); setNewTarget(''); }}>
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
                <TableHead className="text-right">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 mr-1">$</Badge>
                  Spend (USD)
                </TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 mr-1">₹</Badge>
                  Amount (NPR)
                </TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sortedSpendData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditAmount(val);
                              // Auto-calculate target as 60% of spend
                              const amount = parseFloat(val) || 0;
                              setEditTarget(String(Math.round(amount * 0.6)));
                            }}
                            className="w-24 ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span className="text-blue-600 font-medium">${item.amount.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="w-20 ml-auto"
                          />
                        ) : (
                          <span className="font-medium">{item.target_orders || 0}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-semibold">
                          ₹{(item.amount * usdRate).toLocaleString()}
                        </span>
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
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleStartEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
          {canEditAds ? 'Can edit any date' : 'View only'}
          {' • '}Products sorted by highest spend first
        </div>
      </DialogContent>
    </Dialog>
  );
}
