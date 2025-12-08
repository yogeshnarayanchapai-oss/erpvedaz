import { useState } from 'react';
import { useStores, useUpdateStore, useDeleteStore } from '@/hooks/useStores';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Store as StoreIcon, ExternalLink, Settings, ArrowRight, Trash2, Copy } from 'lucide-react';
import { StoreFormDialog } from '@/components/stores/StoreFormDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { getStoreUrl, getStoreDisplayUrl } from '@/lib/storeSubdomain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Stores() {
  const { data: stores = [], isLoading } = useStores();
  const { profile } = useAuth();
  const { currentStore, setCurrentStore, canSwitchStores } = useCurrentStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null);
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();
  const navigate = useNavigate();

  const isOwner = profile?.role === 'OWNER';

  // Redirect non-OWNER users to dashboard
  if (!isOwner) {
    navigate('/admin/dashboard');
    return null;
  }

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

  const handleSwitchToStore = async (storeId: string) => {
    await setCurrentStore(storeId);
    navigate('/admin/dashboard');
  };

  const handleDeleteStore = async () => {
    if (!deleteStoreId) return;
    
    // If deleting current store, switch to another store first
    if (currentStore?.id === deleteStoreId) {
      const otherStore = stores.find(s => s.id !== deleteStoreId);
      if (otherStore) {
        await setCurrentStore(otherStore.id);
      }
    }
    
    await deleteStore.mutateAsync(deleteStoreId);
    setDeleteStoreId(null);
  };

  const storeToDelete = stores.find(s => s.id === deleteStoreId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stores</h1>
          <p className="text-muted-foreground">
            {isOwner 
              ? 'Manage all your e-commerce stores and assign team members'
              : 'View your assigned store'}
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Store
          </Button>
        )}
      </div>

      <StoreFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStoreId} onOpenChange={(open) => !open && setDeleteStoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{storeToDelete?.name}</strong>? 
              This will permanently remove the store and all its data including domains, branding, and user access. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStore.isPending ? 'Deleting...' : 'Delete Store'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Cards for OWNER */}
      {isOwner && stores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground">
                {stores.filter(s => s.is_active).length} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stores.reduce((sum, s) => sum + (s.total_orders || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stores.reduce((sum, s) => sum + (s.total_revenue || 0), 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{currentStore?.name || '-'}</div>
              <p className="text-xs text-muted-foreground">
                Currently viewing
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
              {isOwner 
                ? 'Create your first store to start managing products and orders'
                : 'No store has been assigned to you yet'}
            </p>
            {isOwner && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Store
              </Button>
            )}
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
                <TableRow 
                  key={store.id}
                  className={currentStore?.id === store.id ? 'bg-primary/5' : ''}
                >
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
                        <div className="font-medium flex items-center gap-2">
                          {store.name}
                          {currentStore?.id === store.id && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
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
                    <div className="space-y-1">
                      {/* Path-based URL - main domain + store slug */}
                      <div className="flex items-center gap-1 text-sm">
                        <a
                          href={getStoreUrl(store.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {getStoreDisplayUrl(store.slug)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(getStoreUrl(store.slug));
                            toast.success('URL copied!');
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Admin: {getStoreDisplayUrl(store.slug)}/admin
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <Switch
                          checked={store.is_active}
                          onCheckedChange={() => handleToggleActive(store.id, store.is_active)}
                          disabled={updateStore.isPending}
                        />
                      )}
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
                    <div className="flex items-center justify-end gap-2">
                      {canSwitchStores && currentStore?.id !== store.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitchToStore(store.id)}
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Switch
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/stores/${store.id}`)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteStoreId(store.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Info Card for non-OWNER */}
      {!isOwner && stores.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Contact your OWNER or ADMIN to request access to additional stores.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}