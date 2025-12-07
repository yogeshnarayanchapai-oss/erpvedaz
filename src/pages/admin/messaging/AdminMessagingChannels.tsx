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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, AlertTriangle, MessageSquare, Phone } from 'lucide-react';
import { useMessageChannels, useCreateMessageChannel, useUpdateMessageChannel, useDeleteMessageChannel } from '@/hooks/useMessaging';
import type { MessageChannel, MessageChannelType, MessageProvider } from '@/lib/messaging/types';

const CHANNEL_TYPES: MessageChannelType[] = ['SMS', 'WHATSAPP'];
const PROVIDERS: MessageProvider[] = ['SPARROW', 'TWILIO', 'META', 'OTHER'];

export default function AdminMessagingChannels() {
  const { data: channels, isLoading } = useMessageChannels();
  const createChannel = useCreateMessageChannel();
  const updateChannel = useUpdateMessageChannel();
  const deleteChannel = useDeleteMessageChannel();

  const [showDialog, setShowDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<MessageChannel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'SMS' as MessageChannelType,
    provider: 'OTHER' as MessageProvider,
    api_base_url: '',
    api_key: '',
    api_secret: '',
    sender_id: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'SMS',
      provider: 'OTHER',
      api_base_url: '',
      api_key: '',
      api_secret: '',
      sender_id: '',
      is_active: true,
    });
    setEditingChannel(null);
  };

  const handleEdit = (channel: MessageChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      provider: channel.provider,
      api_base_url: channel.api_base_url || '',
      api_key: channel.api_key || '',
      api_secret: channel.api_secret || '',
      sender_id: channel.sender_id || '',
      is_active: channel.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (editingChannel) {
      await updateChannel.mutateAsync({ id: editingChannel.id, ...formData });
    } else {
      await createChannel.mutateAsync(formData);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteChannel.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Message Channels</h1>
            <p className="text-muted-foreground">Configure SMS and WhatsApp providers</p>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </Button>
        </div>

        <Alert className="bg-amber-500/10 border-amber-500/50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-500">
            API keys and secrets are sensitive. Only share with trusted administrators.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Configured Channels</CardTitle>
            <CardDescription>Manage your SMS and WhatsApp messaging channels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading channels...</p>
            ) : !channels?.length ? (
              <p className="text-muted-foreground">No channels configured yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Sender ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {channel.type === 'SMS' ? <Phone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                          {channel.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{channel.provider}</TableCell>
                      <TableCell>{channel.sender_id || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                          {channel.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(channel)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(channel.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Channel Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add Channel'}</DialogTitle>
              <DialogDescription>Configure a messaging channel for SMS or WhatsApp</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Channel Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Primary SMS"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as MessageChannelType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHANNEL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v as MessageProvider })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input
                  value={formData.api_base_url}
                  onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                  placeholder="https://api.provider.com/v1"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret (if applicable)</Label>
                <Input
                  type="password"
                  value={formData.api_secret}
                  onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                  placeholder="Enter API secret"
                />
              </div>
              <div className="space-y-2">
                <Label>Sender ID</Label>
                <Input
                  value={formData.sender_id}
                  onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                  placeholder="e.g., VAKARI"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formData.name || createChannel.isPending || updateChannel.isPending}>
                {editingChannel ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the channel and all associated automation rules. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
