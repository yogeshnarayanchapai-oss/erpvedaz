import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useLogisticsSettings, 
  useSaveLogisticsSettings, 
  useTestCourierConnection,
  useRoutingRules,
  useSaveRoutingRule,
  useDeleteRoutingRule,
  CourierProvider,
  LogisticsSettings,
  RoutingRule,
} from '@/hooks/useLogistics';
import { 
  Settings, 
  Truck, 
  ChevronDown, 
  Save, 
  TestTube, 
  Check, 
  X,
  Plus,
  Trash2,
  Route,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const COURIER_INFO: Record<CourierProvider, { name: string; color: string; description: string }> = {
  NCM: { name: 'NCM Courier', color: 'bg-blue-500', description: 'Nepal Courier Management' },
  GBL: { name: 'GBL Logistics', color: 'bg-green-500', description: 'Global Business Logistics' },
  PATHAO: { name: 'Pathao Delivery', color: 'bg-orange-500', description: 'Pathao Courier Service' },
  GAAUBESI: { name: 'Gaaubesi Logistics', color: 'bg-purple-500', description: 'Gaaubesi Delivery Service' },
};

export default function AdminLogisticsSettings() {
  const { data: settings = [], isLoading } = useLogisticsSettings();
  const saveSettings = useSaveLogisticsSettings();
  const testConnection = useTestCourierConnection();
  const { data: routingRules = [] } = useRoutingRules();
  const saveRule = useSaveRoutingRule();
  const deleteRule = useDeleteRoutingRule();

  const [formData, setFormData] = useState<Record<CourierProvider, Partial<LogisticsSettings>>>({
    NCM: {},
    GBL: {},
    PATHAO: {},
    GAAUBESI: {},
  });

  const [openCouriers, setOpenCouriers] = useState<Record<CourierProvider, boolean>>({
    NCM: true,
    GBL: false,
    PATHAO: false,
    GAAUBESI: false,
  });

  useEffect(() => {
    if (settings.length > 0) {
      const newFormData: Record<CourierProvider, Partial<LogisticsSettings>> = {
        NCM: {},
        GBL: {},
        PATHAO: {},
        GAAUBESI: {},
      };
      settings.forEach(s => {
        newFormData[s.courier] = s;
      });
      setFormData(newFormData);
    }
  }, [settings]);

  const handleInputChange = (courier: CourierProvider, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [courier]: { ...prev[courier], [field]: value },
    }));
  };

  const handleSave = async (courier: CourierProvider) => {
    await saveSettings.mutateAsync({ courier, ...formData[courier] });
  };

  const handleTest = async (courier: CourierProvider) => {
    await testConnection.mutateAsync(courier);
  };

  const toggleCourier = (courier: CourierProvider) => {
    setOpenCouriers(prev => ({ ...prev, [courier]: !prev[courier] }));
  };

  const CourierSettingsCard = ({ courier }: { courier: CourierProvider }) => {
    const info = COURIER_INFO[courier];
    const data = formData[courier];
    const isOpen = openCouriers[courier];
    const isActive = data.is_active ?? false;

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleCourier(courier)}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${info.color}`} />
                  <div>
                    <CardTitle className="text-lg">{info.name}</CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label htmlFor={`${courier}-active`}>Enable this courier</Label>
                <Switch
                  id={`${courier}-active`}
                  checked={isActive}
                  onCheckedChange={(v) => handleInputChange(courier, 'is_active', v)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input
                    value={data.api_base_url || ''}
                    onChange={(e) => handleInputChange(courier, 'api_base_url', e.target.value)}
                    placeholder="https://api.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input
                    type="password"
                    value={data.api_token || ''}
                    onChange={(e) => handleInputChange(courier, 'api_token', e.target.value)}
                    placeholder="Your API token"
                  />
                </div>
              </div>

              {/* Courier-specific fields */}
              {courier === 'NCM' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Partner ID</Label>
                    <Input
                      value={data.partner_id || ''}
                      onChange={(e) => handleInputChange(courier, 'partner_id', e.target.value)}
                      placeholder="NCM Partner ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Input
                      value={data.account_type || ''}
                      onChange={(e) => handleInputChange(courier, 'account_type', e.target.value)}
                      placeholder="COD / Non-COD"
                    />
                  </div>
                </div>
              )}

              {courier === 'GBL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={data.client_id || ''}
                      onChange={(e) => handleInputChange(courier, 'client_id', e.target.value)}
                      placeholder="GBL Client ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={data.client_password || ''}
                      onChange={(e) => handleInputChange(courier, 'client_password', e.target.value)}
                      placeholder="GBL Password"
                    />
                  </div>
                </div>
              )}

              {courier === 'PATHAO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={data.secret_key || ''}
                      onChange={(e) => handleInputChange(courier, 'secret_key', e.target.value)}
                      placeholder="Pathao Secret Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Store ID</Label>
                    <Input
                      value={data.store_id || ''}
                      onChange={(e) => handleInputChange(courier, 'store_id', e.target.value)}
                      placeholder="Pathao Store ID"
                    />
                  </div>
                </div>
              )}

              {courier === 'GAAUBESI' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pickup City</Label>
                    <Input
                      value={data.pickup_city || ''}
                      onChange={(e) => handleInputChange(courier, 'pickup_city', e.target.value)}
                      placeholder="Kathmandu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pickup Branch</Label>
                    <Input
                      value={data.pickup_branch || ''}
                      onChange={(e) => handleInputChange(courier, 'pickup_branch', e.target.value)}
                      placeholder="Main Branch"
                    />
                  </div>
                </div>
              )}

              <Separator />

              <h4 className="font-medium">Default Pickup Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input
                    value={data.default_sender_name || ''}
                    onChange={(e) => handleInputChange(courier, 'default_sender_name', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender Phone</Label>
                  <Input
                    value={data.default_sender_phone || ''}
                    onChange={(e) => handleInputChange(courier, 'default_sender_phone', e.target.value)}
                    placeholder="98xxxxxxxx"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Pickup Address</Label>
                  <Input
                    value={data.default_pickup_address || ''}
                    onChange={(e) => handleInputChange(courier, 'default_pickup_address', e.target.value)}
                    placeholder="Full pickup address"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => handleSave(courier)} disabled={saveSettings.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleTest(courier)}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Logistics Settings
        </h1>
        <p className="text-muted-foreground">Configure courier integrations and routing rules</p>
      </div>

      <Tabs defaultValue="couriers">
        <TabsList>
          <TabsTrigger value="couriers" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Courier Settings
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Routing Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="couriers" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CourierSettingsCard courier="NCM" />
              <CourierSettingsCard courier="GBL" />
              <CourierSettingsCard courier="PATHAO" />
              <CourierSettingsCard courier="GAAUBESI" />
            </>
          )}
        </TabsContent>

        <TabsContent value="routing" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Auto Routing Rules
              </CardTitle>
              <CardDescription>
                Define rules for automatic courier selection based on delivery location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule.mutate(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Rules are evaluated by priority (highest first). First matching rule wins.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li><strong>Inside Valley</strong>: Kathmandu, Lalitpur, Bhaktapur</li>
                  <li><strong>Outside Valley</strong>: All other districts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
