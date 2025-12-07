import { useState } from 'react';
import { useStaff } from '@/hooks/useStaff';
import { useStaffTargets, useCreateStaffTarget, useUpdateStaffTarget, useDeleteStaffTarget } from '@/hooks/useStaffTargets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminStaffTargets() {
  const { data: targets = [], isLoading } = useStaffTargets();
  const { data: allStaff = [] } = useStaff();
  const createTarget = useCreateStaffTarget();
  const updateTarget = useUpdateStaffTarget();
  const deleteTarget = useDeleteStaffTarget();

  const [isOpen, setIsOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any>(null);
  const [form, setForm] = useState({
    user_id: '',
    daily_target_leads: '',
    daily_target_orders: '',
    daily_target_followups: '',
    active_from: new Date().toISOString().split('T')[0],
    active_to: '',
  });

  const resetForm = () => {
    setForm({
      user_id: '',
      daily_target_leads: '',
      daily_target_orders: '',
      daily_target_followups: '',
      active_from: new Date().toISOString().split('T')[0],
      active_to: '',
    });
    setEditingTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      user_id: form.user_id,
      daily_target_leads: form.daily_target_leads ? parseInt(form.daily_target_leads) : undefined,
      daily_target_orders: form.daily_target_orders ? parseInt(form.daily_target_orders) : undefined,
      daily_target_followups: form.daily_target_followups ? parseInt(form.daily_target_followups) : undefined,
      active_from: form.active_from,
      active_to: form.active_to || undefined,
    };

    if (editingTarget) {
      await updateTarget.mutateAsync({ id: editingTarget.id, ...payload });
    } else {
      await createTarget.mutateAsync(payload);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (target: any) => {
    setEditingTarget(target);
    setForm({
      user_id: target.user_id,
      daily_target_leads: target.daily_target_leads?.toString() || '',
      daily_target_orders: target.daily_target_orders?.toString() || '',
      daily_target_followups: target.daily_target_followups?.toString() || '',
      active_from: target.active_from,
      active_to: target.active_to || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this target?')) {
      await deleteTarget.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Targets</h1>
          <p className="text-muted-foreground">Set daily performance targets for staff</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Target</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTarget ? 'Edit Target' : 'Add Staff Target'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })} disabled={!!editingTarget}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {allStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Leads Target</Label>
                  <Input type="number" value={form.daily_target_leads} onChange={(e) => setForm({ ...form, daily_target_leads: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Orders Target</Label>
                  <Input type="number" value={form.daily_target_orders} onChange={(e) => setForm({ ...form, daily_target_orders: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Follow-ups Target</Label>
                  <Input type="number" value={form.daily_target_followups} onChange={(e) => setForm({ ...form, daily_target_followups: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Active From</Label>
                  <Input type="date" value={form.active_from} onChange={(e) => setForm({ ...form, active_from: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Active To (optional)</Label>
                  <Input type="date" value={form.active_to} onChange={(e) => setForm({ ...form, active_to: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createTarget.isPending || updateTarget.isPending}>
                {editingTarget ? 'Update' : 'Create'} Target
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" />Current Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Follow-ups</TableHead>
                <TableHead>Active Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.profiles?.name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{t.profiles?.role}</Badge></TableCell>
                  <TableCell className="text-center">{t.daily_target_leads ?? '-'}</TableCell>
                  <TableCell className="text-center">{t.daily_target_orders ?? '-'}</TableCell>
                  <TableCell className="text-center">{t.daily_target_followups ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(t.active_from), 'MMM d, yyyy')} - {t.active_to ? format(new Date(t.active_to), 'MMM d, yyyy') : 'Ongoing'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {targets.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No targets set'}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
