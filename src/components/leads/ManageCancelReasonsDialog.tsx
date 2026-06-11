import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Settings2, Trash2, Pencil, Check, X } from 'lucide-react';
import {
  useLeadCancelReasons,
  useCreateLeadCancelReason,
  useUpdateLeadCancelReason,
  useDeleteLeadCancelReason,
} from '@/hooks/useLeadCancelReasons';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

interface Props {
  triggerLabel?: string;
  iconOnly?: boolean;
}

export function ManageCancelReasonsDialog({ triggerLabel = 'Manage Cancel Reasons', iconOnly = false }: Props) {
  const { profile } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const canManage = profile?.role === 'OWNER' || ['ADMIN', 'MANAGER', 'OWNER'].includes(effectiveRole);

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: reasons = [] } = useLeadCancelReasons({ includeInactive: true });
  const createReason = useCreateLeadCancelReason();
  const updateReason = useUpdateLeadCancelReason();
  const deleteReason = useDeleteLeadCancelReason();

  if (!canManage) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createReason.mutateAsync(newName);
    setNewName('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Settings2 className="w-4 h-4 mr-1" />
          {!iconOnly && triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Cancel Reasons</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New cancel reason (e.g. Price too high)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={createReason.isPending || !newName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
            {reasons.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">No cancel reasons yet</p>
            )}
            {reasons.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 p-2">
                {editingId === r.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (editName.trim()) {
                          await updateReason.mutateAsync({ id: r.id, name: editName.trim() });
                        }
                        setEditingId(null);
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${!r.is_active ? 'text-muted-foreground line-through' : ''}`}>
                      {r.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(checked) =>
                          updateReason.mutate({ id: r.id, is_active: checked })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(r.id);
                          setEditName(r.name);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${r.name}"?`)) {
                            deleteReason.mutate(r.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
