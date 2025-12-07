import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import { useMessageAutomationRules, useCreateMessageAutomationRule, useUpdateMessageAutomationRule, useDeleteMessageAutomationRule, useMessageChannels, useMessageTemplates } from '@/hooks/useMessaging';
import { MESSAGE_EVENTS, type MessageAutomationRule, type MessageRecipientType, type MessageEvent } from '@/lib/messaging/types';

const RECIPIENT_TYPES: MessageRecipientType[] = ['CUSTOMER', 'RESELLER', 'STAFF', 'ADMIN'];

export default function AdminMessagingRules() {
  const [eventFilter, setEventFilter] = useState<string>('');
  const { data: rules, isLoading } = useMessageAutomationRules(eventFilter ? { event_name: eventFilter } : undefined);
  const { data: channels } = useMessageChannels();
  const { data: templates } = useMessageTemplates();
  const createRule = useCreateMessageAutomationRule();
  const updateRule = useUpdateMessageAutomationRule();
  const deleteRule = useDeleteMessageAutomationRule();

  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<MessageAutomationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    event_name: 'LEAD_ASSIGNED' as MessageEvent,
    trigger_status_from: '',
    trigger_status_to: '',
    channel_id: '',
    template_id: '',
    send_to: 'CUSTOMER' as MessageRecipientType,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({ event_name: 'LEAD_ASSIGNED', trigger_status_from: '', trigger_status_to: '', channel_id: channels?.[0]?.id || '', template_id: '', send_to: 'CUSTOMER', is_active: true });
    setEditingRule(null);
  };

  const handleEdit = (rule: MessageAutomationRule) => {
    setEditingRule(rule);
    setFormData({ event_name: rule.event_name as MessageEvent, trigger_status_from: rule.trigger_status_from || '', trigger_status_to: rule.trigger_status_to || '', channel_id: rule.channel_id, template_id: rule.template_id, send_to: rule.send_to, is_active: rule.is_active });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    const payload = { event_name: formData.event_name, trigger_status_from: formData.trigger_status_from || null, trigger_status_to: formData.trigger_status_to || null, channel_id: formData.channel_id, template_id: formData.template_id, send_to: formData.send_to, is_active: formData.is_active };
    if (editingRule) await updateRule.mutateAsync({ id: editingRule.id, ...payload });
    else await createRule.mutateAsync(payload);
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async () => { if (deleteId) { await deleteRule.mutateAsync(deleteId); setDeleteId(null); } };

  const activeChannels = channels?.filter((c) => c.is_active) || [];
  const activeTemplates = templates?.filter((t) => t.is_active) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Automation Rules</h1>
          <p className="text-muted-foreground">Configure when and how messages are sent automatically</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} disabled={!activeChannels.length || !activeTemplates.length}>
          <Plus className="w-4 h-4 mr-2" />Add Rule
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="w-64">
            <Label className="text-xs text-muted-foreground">Filter by Event</Label>
            <Select value={eventFilter || 'all'} onValueChange={(v) => setEventFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="All events" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {MESSAGE_EVENTS.map((e) => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rules</CardTitle><CardDescription>Active automation rules for sending messages</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading rules...</p> : !rules?.length ? <p className="text-muted-foreground">No automation rules configured.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Status Trigger</TableHead><TableHead>Channel</TableHead><TableHead>Template</TableHead><TableHead>Send To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell><Badge variant="outline" className="gap-1"><Zap className="w-3 h-3" />{rule.event_name.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.trigger_status_from || '*'} → {rule.trigger_status_to || '*'}</TableCell>
                    <TableCell>{rule.channel?.name || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{rule.template?.code || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{rule.send_to}</Badge></TableCell>
                    <TableCell><Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(rule.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingRule ? 'Edit Rule' : 'Add Automation Rule'}</DialogTitle><DialogDescription>Define when a message should be sent automatically</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Event</Label><Select value={formData.event_name} onValueChange={(v) => setFormData({ ...formData, event_name: v as MessageEvent })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MESSAGE_EVENTS.map((e) => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>From Status (optional)</Label><Input value={formData.trigger_status_from} onChange={(e) => setFormData({ ...formData, trigger_status_from: e.target.value.toUpperCase() })} placeholder="e.g., NEW" /></div>
              <div className="space-y-2"><Label>To Status (optional)</Label><Input value={formData.trigger_status_to} onChange={(e) => setFormData({ ...formData, trigger_status_to: e.target.value.toUpperCase() })} placeholder="e.g., CONFIRMED" /></div>
            </div>
            <div className="space-y-2"><Label>Channel</Label><Select value={formData.channel_id} onValueChange={(v) => setFormData({ ...formData, channel_id: v })}><SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger><SelectContent>{activeChannels.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Template</Label><Select value={formData.template_id} onValueChange={(v) => setFormData({ ...formData, template_id: v })}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{activeTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.code} ({t.language})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Send To</Label><Select value={formData.send_to} onValueChange={(v) => setFormData({ ...formData, send_to: v as MessageRecipientType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RECIPIENT_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={!formData.channel_id || !formData.template_id || createRule.isPending || updateRule.isPending}>{editingRule ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Rule?</AlertDialogTitle><AlertDialogDescription>This will delete the automation rule.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
