import { useState } from 'react';
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Bell, Pencil, Trash2 } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';

export default function HRMNotices() {
  const { data: notices = [], isLoading } = useNotices();
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: '',
    message: '',
    target_audience: 'All',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
  });

  const resetForm = () => {
    setForm({ title: '', message: '', target_audience: 'All', start_date: new Date().toISOString().split('T')[0], end_date: '', is_active: true });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, message: form.message || null, end_date: form.end_date || null };
    if (editing) {
      await updateNotice.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createNotice.mutateAsync(payload);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (n: any) => {
    setEditing(n);
    setForm({
      title: n.title,
      message: n.message || '',
      target_audience: n.target_audience,
      start_date: n.start_date,
      end_date: n.end_date || '',
      is_active: n.is_active,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this notice?')) await deleteNotice.mutateAsync(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notice Board</h1>
          <p className="text-muted-foreground">Manage company announcements</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Notice</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? 'Edit Notice' : 'Add Notice'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="LEADS">Leads</SelectItem>
                      <SelectItem value="CALLING">Calling</SelectItem>
                      <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                      <SelectItem value="LOGISTICS">Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createNotice.isPending || updateNotice.isPending}>{editing ? 'Update' : 'Create'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Notices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.title}</TableCell>
                  <TableCell>{n.target_audience}</TableCell>
                  <TableCell><FormattedDate date={n.start_date} /></TableCell>
                  <TableCell><FormattedDate date={n.end_date} /></TableCell>
                  <TableCell><Badge variant={n.is_active ? 'default' : 'secondary'}>{n.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {notices.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No notices'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
