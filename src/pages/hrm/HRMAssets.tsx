import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, UserPlus, RotateCcw } from 'lucide-react';
import { useAssets, useAssetAssignments, useCreateAsset, useUpdateAsset, useDeleteAsset, useAssignAsset, useReturnAsset, Asset } from '@/hooks/useAssets';
import { useEmployees } from '@/hooks/useHRM';

const CATEGORIES = ['Laptop', 'Phone', 'Tablet', 'Headset', 'Monitor', 'Keyboard', 'Mouse', 'Other'];
const STATUSES = ['Available', 'Assigned', 'Repair', 'Lost', 'Disposed'];

export default function HRMAssets() {
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    asset_code: '',
    name: '',
    category: 'Other',
    description: '',
    purchase_date: '',
    purchase_cost: '',
    status: 'Available' as 'Available' | 'Assigned' | 'Repair' | 'Lost' | 'Disposed',
  });
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    condition_on_assign: '',
    notes: '',
  });

  const { data: assets, isLoading } = useAssets(filter.status || undefined, filter.category || undefined);
  const { data: assignments } = useAssetAssignments();
  const { data: employees } = useEmployees();

  // Calculate total asset value
  const totalAssetValue = assets?.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0) || 0;
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const assignAsset = useAssignAsset();
  const returnAsset = useReturnAsset();

  const resetForm = () => {
    setForm({
      asset_code: '',
      name: '',
      category: 'Other',
      description: '',
      purchase_date: '',
      purchase_cost: '',
      status: 'Available',
    });
    setEditAsset(null);
  };

  const handleSubmit = async () => {
    const data = {
      ...form,
      purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
      purchase_date: form.purchase_date || null,
      description: form.description || null,
    };

    if (editAsset) {
      await updateAsset.mutateAsync({ id: editAsset.id, ...data });
    } else {
      await createAsset.mutateAsync(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleAssign = async () => {
    if (!selectedAsset) return;
    await assignAsset.mutateAsync({
      asset_id: selectedAsset.id,
      employee_id: assignForm.employee_id,
      condition_on_assign: assignForm.condition_on_assign || null,
      notes: assignForm.notes || null,
      assigned_on: new Date().toISOString().split('T')[0],
    });
    setAssignDialogOpen(false);
    setSelectedAsset(null);
    setAssignForm({ employee_id: '', condition_on_assign: '', notes: '' });
  };

  const handleReturn = async (assignment: any) => {
    if (confirm('Mark this asset as returned?')) {
      await returnAsset.mutateAsync({
        assignmentId: assignment.id,
        assetId: assignment.asset_id,
      });
    }
  };

  const openEdit = (asset: Asset) => {
    setEditAsset(asset);
    setForm({
      asset_code: asset.asset_code,
      name: asset.name,
      category: asset.category,
      description: asset.description || '',
      purchase_date: asset.purchase_date || '',
      purchase_cost: asset.purchase_cost?.toString() || '',
      status: asset.status,
    });
    setDialogOpen(true);
  };

  const openAssign = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssignDialogOpen(true);
  };

  const statusColors: Record<string, string> = {
    Available: 'bg-green-100 text-green-800',
    Assigned: 'bg-blue-100 text-blue-800',
    Repair: 'bg-yellow-100 text-yellow-800',
    Lost: 'bg-red-100 text-red-800',
    Disposed: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asset Management</h1>
            <p className="text-muted-foreground">Manage company assets and assignments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Asset Code *</Label>
                    <Input value={form.asset_code} onChange={e => setForm({ ...form, asset_code: e.target.value })} placeholder="AST-001" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="MacBook Pro 14" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Purchase Cost</Label>
                    <Input type="number" value={form.purchase_cost} onChange={e => setForm({ ...form, purchase_cost: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} disabled={!form.asset_code || !form.name} className="w-full">
                  {editAsset ? 'Update' : 'Create'} Asset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Asset Value Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Asset Value</p>
                <p className="text-2xl font-bold text-primary">Rs. {totalAssetValue.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-xl font-semibold">{assets?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={filter.status} onValueChange={v => setFilter({ ...filter, status: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter.category} onValueChange={v => setFilter({ ...filter, category: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Assets ({assets?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
                ) : assets?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center">No assets found</TableCell></TableRow>
                ) : assets?.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.asset_code}</TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[asset.status]}>{asset.status}</Badge>
                    </TableCell>
                    <TableCell>{asset.purchase_date || '-'}</TableCell>
                    <TableCell>{asset.purchase_cost ? `₹${asset.purchase_cost}` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {asset.status === 'Available' && (
                          <Button size="sm" variant="outline" onClick={() => openAssign(asset)}>
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(asset)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteAsset.mutate(asset.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Asset: {selectedAsset?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employee *</Label>
                <Select value={assignForm.employee_id} onValueChange={v => setAssignForm({ ...assignForm, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees?.filter(e => e.status === 'Active').map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition on Assign</Label>
                <Input value={assignForm.condition_on_assign} onChange={e => setAssignForm({ ...assignForm, condition_on_assign: e.target.value })} placeholder="Good / Like New / etc." />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} />
              </div>
              <Button onClick={handleAssign} disabled={!assignForm.employee_id} className="w-full">Assign Asset</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Active Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Assigned On</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments?.filter(a => !a.returned_on).map(assignment => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.assets?.name} ({assignment.assets?.asset_code})</TableCell>
                    <TableCell>{assignment.employees?.full_name}</TableCell>
                    <TableCell>{assignment.assigned_on}</TableCell>
                    <TableCell>{assignment.condition_on_assign || '-'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleReturn(assignment)}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Return
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
