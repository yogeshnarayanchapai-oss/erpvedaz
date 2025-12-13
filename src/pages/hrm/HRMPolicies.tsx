import { useState } from 'react';
import { useHRPolicies, useCreateHRPolicy, useUpdateHRPolicy, useDeleteHRPolicy } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Pencil, Trash2, Eye } from 'lucide-react';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

export default function HRMPolicies() {
  const { data: policies = [], isLoading } = useHRPolicies();
  const createPolicy = useCreateHRPolicy();
  const updatePolicy = useUpdateHRPolicy();
  const deletePolicy = useDeleteHRPolicy();
  const { effectiveRole } = useEffectiveRole();

  const [isOpen, setIsOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', category: '', content: '', is_active: true });

  // Check if user can manage policies (Admin, Manager, HR, Owner)
  const canManage = ['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(effectiveRole);

  const resetForm = () => {
    setForm({ title: '', category: '', content: '', is_active: true });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updatePolicy.mutateAsync({ id: editing.id, ...form });
    } else {
      await createPolicy.mutateAsync(form);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (policy: any) => {
    setEditing(policy);
    setForm({ title: policy.title, category: policy.category || '', content: policy.content || '', is_active: policy.is_active });
    setIsOpen(true);
  };

  const openView = (policy: any) => {
    setViewPolicy(policy);
    setViewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this policy?')) await deletePolicy.mutateAsync(id);
  };

  // Filter active policies for staff view
  const visiblePolicies = canManage ? policies : policies.filter(p => p.is_active);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Policies</h1>
          <p className="text-muted-foreground">
            {canManage ? 'Manage company policies' : 'View company policies'}
          </p>
        </div>
        {canManage && (
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Policy</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? 'Edit Policy' : 'Add Policy'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Leave, Conduct" /></div>
                </div>
                <div className="space-y-2"><Label>Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button type="submit" className="w-full" disabled={createPolicy.isPending || updatePolicy.isPending}>{editing ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Policies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                {canManage && <TableHead>Status</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePolicies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.category || '-'}</TableCell>
                  {canManage && (
                    <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openView(p)} title="View">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visiblePolicies.length === 0 && <TableRow><TableCell colSpan={canManage ? 4 : 3} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No policies'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Policy Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewPolicy?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewPolicy?.category && (
              <Badge variant="outline">{viewPolicy.category}</Badge>
            )}
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {viewPolicy?.content || 'No content available.'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}