import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleLeft } from 'lucide-react';
import { useModuleStoreSettings, useToggleModuleStoreWise } from '@/hooks/useModuleStoreSettings';

const MODULE_INFO: Record<string, { label: string; description: string }> = {
  sales: { label: 'Sales', description: 'Orders, leads, customers — store-wise isolation' },
  inventory: { label: 'Inventory', description: 'Warehouses, stock, products — store-wise isolation' },
  accounting: { label: 'Accounting', description: 'Transactions, parties, accounts — store-wise isolation' },
  marketing: { label: 'Marketing', description: 'Campaigns, ads, influencers — store-wise isolation' },
  hrm: { label: 'HRM', description: 'Employees, attendance, leaves — store-wise isolation' },
};

export default function ModuleStoreToggle() {
  const { data: settings, isLoading } = useModuleStoreSettings();
  const toggleMutation = useToggleModuleStoreWise();

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          Module Store Settings
        </CardTitle>
        <CardDescription>
          ON = store-wise (each store ko data alag) · OFF = global (sabai store ekai thau)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(MODULE_INFO).map(([key, info]) => {
          const setting = settings?.find(s => s.module_name === key);
          const isOn = setting?.is_store_wise ?? true;

          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium">{info.label}</Label>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </div>
              <Switch
                checked={isOn}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ moduleName: key, isStoreWise: checked })
                }
                disabled={toggleMutation.isPending}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
