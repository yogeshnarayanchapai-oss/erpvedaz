import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Phone, 
  ShoppingCart, 
  UserPlus, 
  Package, 
  Calculator,
  FileText,
  Truck,
  DollarSign
} from 'lucide-react';

interface QuickActionsCardProps {
  role?: string;
}

export function QuickActionsCard({ role = 'ADMIN' }: QuickActionsCardProps) {
  const navigate = useNavigate();

  const adminActions = [
    { label: 'New Lead', icon: UserPlus, onClick: () => navigate('/admin/leads?action=new'), color: 'text-blue-500' },
    { label: 'View Orders', icon: ShoppingCart, onClick: () => navigate('/admin/orders'), color: 'text-green-500' },
    { label: 'Daily P/L', icon: Calculator, onClick: () => navigate('/admin/inventory/daily-pl'), color: 'text-purple-500' },
    { label: 'Stock Summary', icon: Package, onClick: () => navigate('/admin/inventory/stock-summary'), color: 'text-orange-500' },
    { label: 'Logistics', icon: Truck, onClick: () => navigate('/admin/logistics/control-center'), color: 'text-red-500' },
    { label: 'Accounting', icon: DollarSign, onClick: () => navigate('/admin/accounting/dashboard-new'), color: 'text-emerald-500' },
  ];

  const callingActions = [
    { label: 'My Leads', icon: Phone, onClick: () => navigate('/calling/leads'), color: 'text-blue-500' },
    { label: 'My Orders', icon: ShoppingCart, onClick: () => navigate('/calling/orders'), color: 'text-green-500' },
    { label: 'Reports', icon: FileText, onClick: () => navigate('/calling/reports'), color: 'text-purple-500' },
  ];

  const actions = role === 'CALLING' ? callingActions : adminActions;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex flex-col gap-1 hover:bg-accent"
              onClick={action.onClick}
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
