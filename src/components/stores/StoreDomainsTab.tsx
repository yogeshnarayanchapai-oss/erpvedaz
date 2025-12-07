import { useState } from 'react';
import { useStoreDomains, useAddStoreDomain, useUpdateStoreDomain, useDeleteStoreDomain } from '@/hooks/useStores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckCircle2, XCircle, Trash2, Star } from 'lucide-react';
import { format } from 'date-fns';
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

interface StoreDomainsTabProps {
  storeId: string;
}

export function StoreDomainsTab({ storeId }: StoreDomainsTabProps) {
  const { data: domains = [], isLoading } = useStoreDomains(storeId);
  const addDomain = useAddStoreDomain();
  const updateDomain = useUpdateStoreDomain();
  const deleteDomain = useDeleteStoreDomain();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    await addDomain.mutateAsync({
      storeId,
      domain: newDomain.trim(),
      is_primary: isPrimary,
    });

    setIsAddOpen(false);
    setNewDomain('');
    setIsPrimary(false);
  };

  const handleSetPrimary = async (domainId: string) => {
    await updateDomain.mutateAsync({
      id: domainId,
      storeId,
      is_primary: true,
    });
  };

  const handleMarkVerified = async (domainId: string, isVerified: boolean) => {
    await updateDomain.mutateAsync({
      id: domainId,
      storeId,
      verified_at: isVerified ? null : new Date().toISOString(),
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteDomain.mutateAsync({ id: deleteId, storeId });
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Domains</CardTitle>
              <CardDescription>
                Manage custom domains and subdomains for this store. Example: vakari.com.np, sumi.vakari.store
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No domains configured yet.</p>
              <p className="text-sm mt-1">Add your first domain to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{domain.domain}</code>
                        {domain.is_primary && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={domain.verified_at ? 'default' : 'secondary'}>
                        {domain.verified_at ? 'Active' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {domain.verified_at ? (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">
                            {format(new Date(domain.verified_at), 'PPP')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-warning">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm">Not verified</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(domain.created_at), 'PPP')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!domain.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(domain.id)}
                            disabled={updateDomain.isPending}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkVerified(domain.id, !!domain.verified_at)}
                          disabled={updateDomain.isPending}
                        >
                          {domain.verified_at ? 'Unverify' : 'Mark Verified'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(domain.id)}
                          disabled={deleteDomain.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="vakari.com.np or subdomain.vakari.store"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the full domain name including subdomain
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
              />
              <Label htmlFor="is_primary" className="cursor-pointer">
                Set as primary domain
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDomain}
              disabled={!newDomain.trim() || addDomain.isPending}
            >
              {addDomain.isPending ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this domain? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
