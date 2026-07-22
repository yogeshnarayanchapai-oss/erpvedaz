import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  useLogisticsSettings,
  useSaveLogisticsSettings,
  useDeleteLogisticsSettings,
  useTestCourierConnection,
  useRoutingRules,
  useSaveRoutingRule,
  useDeleteRoutingRule,
  CourierProvider,
  LogisticsSettings,
} from '@/hooks/useLogistics';
import { Settings, Truck, Save, TestTube, Plus, Trash2, Route, Loader2, Pencil } from 'lucide-react';

const PROVIDER_TYPES: { value: CourierProvider; label: string; help: string }[] = [
  { value: 'NCM', label: 'NCM', help: 'Requires API base URL, API token, Partner ID' },
  { value: 'GBL', label: 'GBL', help: 'Requires API base URL and Client ID' },
  { value: 'PATHAO', label: 'Pathao', help: 'Requires API base URL, API token, Store ID' },
  { value: 'GAAUBESI', label: 'Gaaubesi', help: 'Requires API base URL and API token' },
];

type FormState = Partial<LogisticsSettings> & { courier: CourierProvider };

export default function AdminLogisticsSettings() {
  const { data: settings = [], isLoading } = useLogisticsSettings();
  const saveSettings = useSaveLogisticsSettings();
  const deleteSetting = useDeleteLogisticsSettings();
  const testConnection = useTestCourierConnection();
  const { data: routingRules = [] } = useRoutingRules();
  const saveRule = useSaveRoutingRule();
  const deleteRule = useDeleteRoutingRule();

  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openNew = () => setEditing({ courier: 'NCM', display_name: '', is_active: true } as any);
  const openEdit = (s: LogisticsSettings) => setEditing({ ...s });

  const setField = (field: string, value: any) =>
    setEditing((prev) => (prev ? ({ ...prev, [field]: value } as FormState) : prev));

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.display_name || !(editing.display_name as string).trim()) {
      return;
    }
    await saveSettings.mutateAsync(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Logistics Settings
          </h1>
          <p className="text-muted-foreground">Add and configure your courier integrations</p>
        </div>
      </div>

      <Tabs defaultValue="couriers">
        <TabsList>
          <TabsTrigger value="couriers" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Courier Integration
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Routing Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="couriers" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {settings.length === 0
                ? 'No couriers configured yet. Add your first courier to enable pushing orders to it.'
                : `${settings.length} courier${settings.length > 1 ? 's' : ''} configured`}
            </p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> Add Courier
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : settings.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No couriers yet. Click <strong>Add Courier</strong> to create one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {settings.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {s.display_name || s.courier}
                        <Badge variant="outline" className="text-xs">{s.courier}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {s.api_base_url || 'No API URL set'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => testConnection.mutate(s.courier)}>
                        <TestTube className="w-3 h-3 mr-1" /> Test
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingId(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="routing" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" /> Auto Routing Rules
              </CardTitle>
              <CardDescription>
                Rules for automatic courier selection based on delivery location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {routingRules.length === 0 && (
                <p className="text-sm text-muted-foreground">No routing rules yet.</p>
              )}
              {routingRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Priority: {rule.priority}</Badge>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {rule.delivery_location || 'Any location'} → {rule.recommended_courier}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => saveRule.mutate({ id: rule.id, is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Courier' : 'Add Courier'}</DialogTitle>
            <DialogDescription>
              Give your courier a name and enter its API credentials.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name *</Label>
                  <Input
                    value={(editing.display_name as string) || ''}
                    onChange={(e) => setField('display_name', e.target.value)}
                    placeholder="e.g. NCM Kathmandu"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider Type *</Label>
                  <Select value={editing.courier} onValueChange={(v) => setField('courier', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {PROVIDER_TYPES.find((p) => p.value === editing.courier)?.help}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label>Active</Label>
                <Switch
                  checked={editing.is_active ?? false}
                  onCheckedChange={(v) => setField('is_active', v)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input
                    value={editing.api_base_url || ''}
                    onChange={(e) => setField('api_base_url', e.target.value)}
                    placeholder="https://api.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input
                    type="password"
                    value={editing.api_token || ''}
                    onChange={(e) => setField('api_token', e.target.value)}
                    placeholder="Your API token"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium">Additional Credentials <span className="text-xs text-muted-foreground font-normal">(fill only what your courier needs)</span></h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Partner ID</Label>
                  <Input value={editing.partner_id || ''} onChange={(e) => setField('partner_id', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Input value={editing.account_type || ''} onChange={(e) => setField('account_type', e.target.value)} placeholder="COD / Non-COD (optional)" />
                </div>
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input value={editing.client_id || ''} onChange={(e) => setField('client_id', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Client Password</Label>
                  <Input type="password" value={editing.client_password || ''} onChange={(e) => setField('client_password', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Store ID</Label>
                  <Input value={editing.store_id || ''} onChange={(e) => setField('store_id', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input type="password" value={editing.secret_key || ''} onChange={(e) => setField('secret_key', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Pickup City</Label>
                  <Input value={editing.pickup_city || ''} onChange={(e) => setField('pickup_city', e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Pickup Branch</Label>
                  <Input value={editing.pickup_branch || ''} onChange={(e) => setField('pickup_branch', e.target.value)} placeholder="Optional" />
                </div>
              </div>


              <Separator />
              <h4 className="font-medium">Default Pickup Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input value={editing.default_sender_name || ''} onChange={(e) => setField('default_sender_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sender Phone</Label>
                  <Input value={editing.default_sender_phone || ''} onChange={(e) => setField('default_sender_phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pickup Address</Label>
                  <Input value={editing.default_pickup_address || ''} onChange={(e) => setField('default_pickup_address', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveSettings.isPending || !editing?.display_name}>
              {saveSettings.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove courier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the courier configuration. Orders already pushed to this courier are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) deleteSetting.mutate(deletingId);
                setDeletingId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
