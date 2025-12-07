import { useState } from 'react';
import { useLeadSources, useCreateLeadSource, useUpdateLeadSource, useDeleteLeadSource } from '@/hooks/useLeadSources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';

export function LeadSourcesManagement() {
  const { data: sources = [], isLoading } = useLeadSources();
  const createSource = useCreateLeadSource();
  const updateSource = useUpdateLeadSource();
  const deleteSource = useDeleteLeadSource();

  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<{ id: string; name: string } | null>(null);
  const [newSourceName, setNewSourceName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingSource(null);
    setNewSourceName('');
    setShowDialog(true);
  };

  const handleOpenEdit = (source: { id: string; name: string }) => {
    setEditingSource(source);
    setNewSourceName(source.name);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!newSourceName.trim()) return;

    if (editingSource) {
      await updateSource.mutateAsync({ id: editingSource.id, name: newSourceName.trim() });
    } else {
      await createSource.mutateAsync(newSourceName.trim());
    }
    setShowDialog(false);
    setNewSourceName('');
    setEditingSource(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSource.mutateAsync(deleteId);
    setShowDeleteDialog(false);
    setDeleteId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Lead Sources
        </CardTitle>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Source
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6">Loading...</TableCell>
              </TableRow>
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  No lead sources found
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell><FormattedDate date={source.created_at} /></TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(source)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteId(source.id);
                        setShowDeleteDialog(true);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSource ? 'Edit Lead Source' : 'Add Lead Source'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Source name (e.g., YouTube Ads)"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={!newSourceName.trim() || createSource.isPending || updateSource.isPending}
            >
              {createSource.isPending || updateSource.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Lead Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This source will be hidden from the lead entry form. Existing leads will keep their source reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteSource.isPending}
            >
              {deleteSource.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
