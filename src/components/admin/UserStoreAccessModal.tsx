import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useUserStoreAccess, useAssignUserToStore, useRemoveUserFromStore } from '@/hooks/useUserStoreAccess';

interface UserStoreAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function UserStoreAccessModal({ open, onOpenChange, user }: UserStoreAccessModalProps) {
  const { data: stores = [] } = useStores();
  const { data: userAccess = [], isLoading } = useUserStoreAccess(user.id);
  const assignMutation = useAssignUserToStore();
  const removeMutation = useRemoveUserFromStore();

  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('staff');

  const assignedStoreIds = userAccess.map(a => a.store_id);
  const availableStores = stores.filter(s => !assignedStoreIds.includes(s.id));

  const handleAssign = async () => {
    if (!selectedStoreId) return;

    await assignMutation.mutateAsync({
      user_id: user.id,
      store_id: selectedStoreId,
      access_level: selectedAccessLevel,
    });

    setSelectedStoreId('');
    setSelectedAccessLevel('staff');
  };

  const handleRemove = async (storeId: string) => {
    await removeMutation.mutateAsync({
      userId: user.id,
      storeId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Store Access</DialogTitle>
          <DialogDescription>
            Assign stores to {user.name} ({user.role})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignments */}
          <div>
            <Label className="text-sm font-medium">Assigned Stores</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground mt-2">Loading...</div>
            ) : userAccess.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-2">No stores assigned</div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {userAccess.map((access) => (
                  <Badge
                    key={access.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {access.store?.name || 'Unknown Store'}
                    <span className="text-xs opacity-60">({access.access_level})</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                      onClick={() => handleRemove(access.store_id)}
                      disabled={removeMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignment */}
          {availableStores.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-medium">Add Store Access</Label>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAssign}
                disabled={!selectedStoreId || assignMutation.isPending}
                className="w-full"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign Store'}
              </Button>
            </div>
          )}

          {availableStores.length === 0 && stores.length > 0 && (
            <div className="text-sm text-muted-foreground text-center py-2 border-t">
              User has access to all stores
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
