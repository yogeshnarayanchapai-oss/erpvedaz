import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Plus, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface AuditNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  type: 'general' | 'observation' | 'recommendation';
}

export function AuditNotesSection() {
  const [notes, setNotes] = useState<AuditNote[]>([
    {
      id: '1',
      title: 'Year-End Observations',
      content: 'All major transactions have been verified and reconciled.',
      createdAt: format(new Date(), 'yyyy-MM-dd'),
      type: 'observation',
    },
  ]);
  
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'general' as const,
  });
  const [showForm, setShowForm] = useState(false);

  const handleAddNote = () => {
    if (!newNote.title || !newNote.content) return;
    
    setNotes(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        ...newNote,
        createdAt: format(new Date(), 'yyyy-MM-dd'),
      },
    ]);
    setNewNote({ title: '', content: '', type: 'general' });
    setShowForm(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const typeColors = {
    general: 'bg-muted text-muted-foreground',
    observation: 'bg-info/10 text-info',
    recommendation: 'bg-warning/10 text-warning',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Audit Notes & Remarks</h2>
          <p className="text-sm text-muted-foreground">
            Add observations, recommendations, and general notes for audit purposes
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Note
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Audit Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Note title"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={newNote.type}
                  onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="general">General</option>
                  <option value="observation">Observation</option>
                  <option value="recommendation">Recommendation</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your note here..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote}>
                <Save className="w-4 h-4 mr-1" /> Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-base">{note.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={typeColors[note.type]} variant="secondary">
                    {note.type}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {note.content}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Added on {note.createdAt}
              </p>
            </CardContent>
          </Card>
        ))}
        
        {notes.length === 0 && !showForm && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit notes yet</p>
            <p className="text-sm">Click "Add Note" to create your first note</p>
          </div>
        )}
      </div>
    </div>
  );
}
