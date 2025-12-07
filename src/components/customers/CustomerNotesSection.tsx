import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomerNotes, useCreateCustomerNote, useDeleteCustomerNote } from '@/hooks/useCustomerNotes';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Plus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CustomerNotesSectionProps {
  customerId: string;
}

export function CustomerNotesSection({ customerId }: CustomerNotesSectionProps) {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('GENERAL');
  const [showAddNote, setShowAddNote] = useState(false);

  const { data: notes, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateCustomerNote();
  const deleteNote = useDeleteCustomerNote();

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    createNote.mutate({
      customerId,
      note: newNote,
      noteType,
    }, {
      onSuccess: () => {
        setNewNote('');
        setShowAddNote(false);
      },
    });
  };

  const getNoteTypeColor = (type: string | null) => {
    switch (type) {
      case 'VIP': return 'bg-primary text-primary-foreground';
      case 'FRAUD': return 'bg-destructive text-destructive-foreground';
      case 'RTO_RISK': return 'bg-orange-500 text-white';
      case 'IMPORTANT': return 'bg-yellow-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Notes & Comments</h3>
        <Button 
          onClick={() => setShowAddNote(!showAddNote)}
          size="sm"
          variant={showAddNote ? "outline" : "default"}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      {showAddNote && (
        <div className="mb-4 space-y-3 p-4 border rounded-lg bg-muted/50">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger>
              <SelectValue placeholder="Note Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="VIP">VIP Customer</SelectItem>
              <SelectItem value="FRAUD">Fraud Alert</SelectItem>
              <SelectItem value="RTO_RISK">RTO Risk</SelectItem>
              <SelectItem value="IMPORTANT">Important</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button onClick={handleAddNote} disabled={createNote.isPending}>
              Save Note
            </Button>
            <Button variant="outline" onClick={() => {
              setShowAddNote(false);
              setNewNote('');
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
      ) : !notes || notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No notes yet</div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="border rounded-lg p-4 bg-background hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getNoteTypeColor(note.note_type)}>
                      {note.note_type || 'GENERAL'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {note.profiles?.name || 'Unknown'} • {note.created_at && formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Note</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this note? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteNote.mutate({ noteId: note.id, customerId })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
