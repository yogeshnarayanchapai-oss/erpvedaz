import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Warehouse, Trash2, Eye, EyeOff } from 'lucide-react';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, Warehouse as WarehouseType } from '@/hooks/useWarehouses';

export default function Warehouses() {
  const navigate = useNavigate();
  const { data: warehouses, isLoading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', location: '', is_active: true, remarks: '' });

  const resetForm = () => {
    setForm({ name: '', code: '', location: '', is_active: true, remarks: '' });
    setEditing(null);
  };

  const openEdit = (w: WarehouseType) => {
    setEditing(w);
    setForm({
      name: w.name,
      code: w.code,
      location: w.location || '',
      is_active: w.is_active,
      remarks: w.remarks || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code) return;
    if (editing) {
      await updateWarehouse.mutateAsync({ id: editing.id, ...form });
    } else {
      await createWarehouse.mutateAsync(form);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDeactivate = async (warehouse: WarehouseType) => {
    await updateWarehouse.mutateAsync({ id: warehouse.id, is_active: false });
  };

  const handleReactivate = async (warehouse: WarehouseType) => {
    await updateWarehouse.mutateAsync({ id: warehouse.id, is_active: true });
  };

  const filteredWarehouses = showInactive 
    ? warehouses 
    : warehouses?.filter(w => w.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground">Manage your storage locations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Label className="text-sm text-muted-foreground">Show inactive</Label>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Warehouse</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Valley Warehouse" />
                </div>
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VALLEY" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Kathmandu" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                  <Label>Active</Label>
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.name || !form.code}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5" />All Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !filteredWarehouses?.length ? (
            <p className="text-muted-foreground">No warehouses found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.map((w) => (
                  <TableRow key={w.id} className={!w.is_active ? 'opacity-60' : ''}>
                    <TableCell 
                      className="font-medium cursor-pointer hover:text-primary hover:underline"
                      onClick={() => navigate(`/admin/inventory/warehouses/${w.id}`)}
                    >
                      {w.name}
                    </TableCell>
                    <TableCell>{w.code}</TableCell>
                    <TableCell>{w.location || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={w.is_active ? 'default' : 'secondary'}>
                        {w.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {w.is_active ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Warehouse?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will hide "{w.name}" from all dropdowns and filters. You can reactivate it later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeactivate(w)}>
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleReactivate(w)}>
                            <Eye className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}