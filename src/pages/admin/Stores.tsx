import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Store as StoreIcon, ExternalLink, Settings } from 'lucide-react';
import { StoreFormDialog } from '@/components/stores/StoreFormDialog';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useUpdateStore } from '@/hooks/useStores';

export default function Stores() {
  const { data: stores = [], isLoading } = useStores();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const updateStore = useUpdateStore();
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NPR', 'Rs');
  };

  const handleToggleActive = async (storeId: string, currentStatus: boolean) => {
    await updateStore.mutateAsync({
      id: storeId,
      is_active: !currentStatus,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stores</h1>
          <p className="text-muted-foreground">Manage all your e-commerce stores and websites</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Store
        </Button>
      </div>

      <StoreFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <StoreIcon className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No stores yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first store to start managing products and orders
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Primary Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orders (30d)</TableHead>
                <TableHead className="text-right">Revenue (30d)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: store.primary_color }}
                        >
                          {store.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{store.name}</div>
                        {store.contact_email && (
                          <div className="text-xs text-muted-foreground">{store.contact_email}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{store.slug}</code>
                  </TableCell>
                  <TableCell>
                    {store.default_subdomain ? (
                      <div className="flex items-center gap-1 text-sm">
                        {store.default_subdomain}.vakari.store
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={store.is_active}
                        onCheckedChange={() => handleToggleActive(store.id, store.is_active)}
                        disabled={updateStore.isPending}
                      />
                      <Badge variant={store.is_active ? 'default' : 'secondary'}>
                        {store.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {store.total_orders || 0}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(store.total_revenue || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/stores/${store.id}`)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
