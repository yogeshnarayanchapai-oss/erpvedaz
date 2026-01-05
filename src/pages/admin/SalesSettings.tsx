import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { LeadSourcesManagement } from '@/components/admin/LeadSourcesManagement';
import { OrderCopyFormatEditor } from '@/components/admin/OrderCopyFormatEditor';

export default function SalesSettings() {
  const { profile } = useAuth();

  // Only ADMIN or OWNER can access this
  if (profile?.role !== 'ADMIN' && profile?.role !== 'OWNER' && profile?.role !== 'MANAGER') {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access sales settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Sales Settings</h1>
        <p className="text-muted-foreground">Configure order copy format and lead sources</p>
      </div>

      {/* Order Copy Format Editor */}
      <OrderCopyFormatEditor />

      {/* Lead Sources Management */}
      <LeadSourcesManagement />
    </div>
  );
}
