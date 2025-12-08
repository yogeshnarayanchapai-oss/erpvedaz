import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserCog, Loader2 } from 'lucide-react';
import { useStoreUsers, useAssignUserToStore, useRemoveUserFromStore, useUpdateUserStoreAccess } from '@/hooks/useUserStoreAccess';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface StoreUsersTabProps {
  storeId: string;
}

export function StoreUsersTab({ storeId }: StoreUsersTabProps) {
  const { data: storeUsers = [], isLoading } = useStoreUsers(storeId);
  const assignMutation = useAssignUserToStore();
  const removeMutation = useRemoveUserFromStore();
  const updateMutation = useUpdateUserStoreAccess();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('staff');
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<{ userId: string; accessLevel: string } | null>(null);

  // Fetch all users for the dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-store-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const assignedUserIds = storeUsers.map((u) => u.user_id);
  const availableUsers = allUsers.filter((u) => !assignedUserIds.includes(u.id));

  const handleAssign = async () => {
    if (!selectedUserId) return;

    try {
      await assignMutation.mutateAsync({
        user_id: selectedUserId,
        store_id: storeId,
        access_level: selectedAccessLevel,
      });
      setIsAddOpen(false);
      setSelectedUserId('');
      setSelectedAccessLevel('staff');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRemove = async () => {
    if (!removeUserId) return;

    try {
      await removeMutation.mutateAsync({
        userId: removeUserId,
        storeId,
      });
      setRemoveUserId(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdateAccess = async () => {
    if (!editingUser) return;

    try {
      await updateMutation.mutateAsync({
        userId: editingUser.userId,
        storeId,
        access_level: editingUser.accessLevel,
      });
      setEditingUser(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getAccessLevelBadge = (level: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      admin: 'default',
      manager: 'secondary',
      staff: 'outline',
      view: 'outline',
    };
    return <Badge variant={variants[level] || 'outline'}>{level}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Store Users</CardTitle>
              <CardDescription>
                Manage who has access to this store and their permission levels
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {storeUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users assigned to this store yet.</p>
              <p className="text-sm mt-1">Add users to give them access to this store's data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeUsers.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{access.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{access.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{access.user?.role || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      {getAccessLevelBadge(access.access_level)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser({ userId: access.user_id, accessLevel: access.access_level })}
                        >
                          <UserCog className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveUserId(access.user_id)}
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

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">All users are already assigned to this store</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admin users can manage all store data and other staff members
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Access Level Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Access Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select
                value={editingUser?.accessLevel}
                onValueChange={(val) => setEditingUser(prev => prev ? { ...prev, accessLevel: val } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccess} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeUserId} onOpenChange={() => setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user's access to this store? They will no longer be able to view or manage any data in this store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
