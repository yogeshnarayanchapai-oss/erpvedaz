import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Loader2, Plus, Save, Trash2, Edit2, X } from 'lucide-react';
import { useAdSpendReference, useUpsertAdSpendReference, useDeleteAdSpendReference } from '@/hooks/useAdSpendReference';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AdSpendReferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdSpendReferenceModal({ open, onOpenChange }: AdSpendReferenceModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProductId, setNewProductId] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newDate, setNewDate] = useState<Date>(new Date());

  const { effectiveRole } = useEffectiveRole();
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER';
  const isMarketing = effectiveRole === 'MARKETING';

  // Calculate editable date range based on role
  const minEditableDate = useMemo(() => {
    if (isAdmin) return undefined; // Admin can edit any date
    if (isMarketing) return subDays(new Date(), 7); // Marketing can edit last 7 days
    return new Date(); // Others can only edit today
  }, [isAdmin, isMarketing]);

  const filterDate = dateFilter ? format(dateFilter, 'yyyy-MM-dd') : undefined;

  const { data: spendData, isLoading } = useAdSpendReference({
    startDate: filterDate,
    endDate: filterDate,
    productId: selectedProductId || undefined,
  });

  const { data: products } = useProducts();
  const upsertMutation = useUpsertAdSpendReference();
  const deleteMutation = useDeleteAdSpendReference();

  const canEditRow = (spendDate: string) => {
    if (isAdmin) return true;
    if (!minEditableDate) return false;
    const rowDate = new Date(spendDate);
    return rowDate >= minEditableDate;
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditNotes(item.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditNotes('');
  };

  const handleSaveEdit = async (item: any) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;

    await upsertMutation.mutateAsync({
      product_id: item.product_id,
      spend_date: item.spend_date,
      amount,
      notes: editNotes || null,
    });
    handleCancelEdit();
  };

  const handleAddNew = async () => {
    if (!newProductId) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) return;

    await upsertMutation.mutateAsync({
      product_id: newProductId,
      spend_date: format(newDate, 'yyyy-MM-dd'),
      amount,
      notes: newNotes || null,
    });

    setShowAddForm(false);
    setNewProductId('');
    setNewAmount('');
    setNewNotes('');
    setNewDate(new Date());
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this entry?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ad Spend Reference
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {dateFilter ? format(dateFilter, 'MMM dd, yyyy') : 'Select Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Product Filter */}
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Products</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* Add Button */}
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>

        {/* Add New Form */}
        {showAddForm && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">New Ad Spend Entry</h4>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(newDate, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newDate}
                      onSelect={(d) => d && setNewDate(d)}
                      disabled={minEditableDate ? { before: minEditableDate } : undefined}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Product</label>
                <Select value={newProductId} onValueChange={setNewProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Amount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddNew} disabled={!newProductId || upsertMutation.isPending}>
                {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Entry
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : spendData?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No ad spend entries found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                spendData?.map((item) => {
                  const isEditing = editingId === item.id;
                  const canEdit = canEditRow(item.spend_date);

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.spend_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{item.product?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 ml-auto"
                          />
                        ) : (
                          `₹${item.amount.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notes"
                            className="w-40"
                          />
                        ) : (
                          <span className="text-muted-foreground">{item.notes || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.updater?.name || item.creator?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEdit(item)}
                              disabled={upsertMutation.isPending}
                            >
                              <Save className="h-4 w-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : canEdit ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => handleStartEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Read-only</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
