import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteLeadsButtonProps {
  selectedIds: string[];
  onDeleteComplete: () => void;
}

export function DeleteLeadsButton({ selectedIds, onDeleteComplete }: DeleteLeadsButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Check for leads with linked orders
      const { data: leadsWithOrders } = await supabase
        .from('orders')
        .select('lead_id')
        .in('lead_id', selectedIds);

      const linkedLeadIds = new Set(leadsWithOrders?.map(o => o.lead_id) || []);
      const deletableIds = selectedIds.filter(id => !linkedLeadIds.has(id));
      const blockedCount = selectedIds.length - deletableIds.length;

      if (deletableIds.length === 0) {
        toast.error(`Cannot delete: All ${blockedCount} selected lead(s) have linked orders`);
        setIsDeleting(false);
        setShowConfirm(false);
        return;
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', deletableIds);

      if (error) throw error;

      if (blockedCount > 0) {
        toast.warning(`Deleted ${deletableIds.length} lead(s). ${blockedCount} lead(s) with orders were skipped.`);
      } else {
        toast.success(`${deletableIds.length} lead(s) deleted successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onDeleteComplete();
    } catch (error: any) {
      toast.error(`Failed to delete leads: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Delete Selected ({selectedIds.length})
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected lead(s)?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}