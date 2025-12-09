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
import { X, Edit2 } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useUserStoreAccess, useAssignUserToStore, useRemoveUserFromStore, useUpdateUserStoreAccess } from '@/hooks/useUserStoreAccess';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'CALLING', label: 'Calling' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'FOLLOWUP', label: 'Follow-up' },
  { value: 'LEADS', label: 'Leads' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

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
  const { profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';
  
  const { data: stores = [] } = useStores();
  const { data: userAccess = [], isLoading } = useUserStoreAccess(user.id);
  const assignMutation = useAssignUserToStore();
  const removeMutation = useRemoveUserFromStore();
  const updateMutation = useUpdateUserStoreAccess();

  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('staff');
  const [selectedStoreRole, setSelectedStoreRole] = useState<AppRole | ''>('');
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<AppRole | ''>('');

  const assignedStoreIds = userAccess.map(a => a.store_id);
  const availableStores = stores.filter(s => !assignedStoreIds.includes(s.id));

  const handleAssign = async () => {
    if (!selectedStoreId) return;

    await assignMutation.mutateAsync({
      user_id: user.id,
      store_id: selectedStoreId,
      access_level: selectedAccessLevel,
      store_role: selectedStoreRole || null,
    });

    setSelectedStoreId('');
    setSelectedAccessLevel('staff');
    setSelectedStoreRole('');
  };

  const handleRemove = async (storeId: string) => {
    await removeMutation.mutateAsync({
      userId: user.id,
      storeId,
    });
  };

  const handleUpdateRole = async (accessId: string) => {
    await updateMutation.mutateAsync({
      id: accessId,
      store_role: editingRole || null,
    });
    setEditingAccessId(null);
    setEditingRole('');
  };

  const getRoleBadgeVariant = (role: AppRole | null): 'default' | 'secondary' | 'outline' => {
    if (!role) return 'outline';
    if (['ADMIN', 'OWNER', 'MANAGER'].includes(role)) return 'default';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Store Access</DialogTitle>
          <DialogDescription>
            Assign stores to {user.name} ({user.role})
            {isOwner && <span className="block text-xs mt-1">As OWNER, you can assign per-store roles</span>}
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
              <div className="space-y-2 mt-2">
                {userAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{access.store?.name || 'Unknown Store'}</span>
                      {access.store_role ? (
                        <Badge variant={getRoleBadgeVariant(access.store_role)}>
                          {access.store_role}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No role
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwner && (
                        editingAccessId === access.id ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={editingRole}
                              onValueChange={(val) => setEditingRole(val as AppRole)}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((role) => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleUpdateRole(access.id)}
                              disabled={updateMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                setEditingAccessId(null);
                                setEditingRole('');
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingAccessId(access.id);
                              setEditingRole(access.store_role || '');
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemove(access.store_id)}
                        disabled={removeMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignment */}
          {availableStores.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-medium">Add Store Access</Label>
              
              <div className="grid grid-cols-1 gap-2">
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

                {isOwner && (
                  <Select
                    value={selectedStoreRole}
                    onValueChange={(val) => setSelectedStoreRole(val as AppRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role for this store" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
