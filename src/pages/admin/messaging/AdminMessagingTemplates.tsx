import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Eye, Info, MessageSquare, Phone } from 'lucide-react';
import { useMessageTemplates, useCreateMessageTemplate, useUpdateMessageTemplate, useDeleteMessageTemplate } from '@/hooks/useMessaging';
import { previewTemplate } from '@/lib/messaging/templateRenderer';
import { MESSAGE_EVENTS, TEMPLATE_PLACEHOLDERS, type MessageTemplate, type MessageChannelType, type MessageEvent } from '@/lib/messaging/types';

const CHANNEL_TYPES: MessageChannelType[] = ['SMS', 'WHATSAPP'];
const LANGUAGES = ['en', 'ne'];

export default function AdminMessagingTemplates() {
  const [filters, setFilters] = useState<{ channel_type?: MessageChannelType; language?: string }>({});
  const { data: templates, isLoading } = useMessageTemplates(filters);
  const createTemplate = useCreateMessageTemplate();
  const updateTemplate = useUpdateMessageTemplate();
  const deleteTemplate = useDeleteMessageTemplate();

  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    channel_type: 'SMS' as MessageChannelType,
    language: 'en',
    content: '',
    description: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({ code: '', channel_type: 'SMS', language: 'en', content: '', description: '', is_active: true });
    setEditingTemplate(null);
    setPreviewMode(false);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      code: template.code,
      channel_type: template.channel_type,
      language: template.language,
      content: template.content,
      description: template.description || '',
      is_active: template.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getPlaceholders = () => {
    const event = MESSAGE_EVENTS.find((e) => formData.code.startsWith(e));
    return event ? TEMPLATE_PLACEHOLDERS[event] : [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-muted-foreground">Create and manage message templates with placeholders</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Channel Type</Label>
              <Select value={filters.channel_type || 'all'} onValueChange={(v) => setFilters({ ...filters, channel_type: v === 'all' ? undefined : v as MessageChannelType })}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CHANNEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Language</Label>
              <Select value={filters.language || 'all'} onValueChange={(v) => setFilters({ ...filters, language: v === 'all' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="All languages" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l === 'en' ? 'English' : 'Nepali'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Message templates for automation rules</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading templates...</p>
          ) : !templates?.length ? (
            <p className="text-muted-foreground">No templates found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="max-w-xs">Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-mono text-sm">{template.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {template.channel_type === 'SMS' ? <Phone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        {template.channel_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{template.language === 'en' ? 'English' : 'Nepali'}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{template.content.substring(0, 50)}...</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>{template.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(template.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add Template'}</DialogTitle>
            <DialogDescription>Create a message template with placeholders</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Template Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., LEAD_ASSIGNED_EN" disabled={!!editingTemplate} />
              </div>
              <div className="space-y-2">
                <Label>Channel Type</Label>
                <Select value={formData.channel_type} onValueChange={(v) => setFormData({ ...formData, channel_type: v as MessageChannelType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l === 'en' ? 'English' : 'Nepali'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
            </div>
            {getPlaceholders().length > 0 && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription><span className="font-medium">Placeholders:</span> <span className="font-mono text-xs">{getPlaceholders().join(', ')}</span></AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Message Content</Label>
                <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}><Eye className="w-4 h-4 mr-1" />{previewMode ? 'Edit' : 'Preview'}</Button>
              </div>
              {previewMode ? (
                <div className="p-4 bg-muted rounded-md min-h-[100px] whitespace-pre-wrap text-sm">{previewTemplate(formData.content)}</div>
              ) : (
                <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Hello {{customer_name}}..." rows={4} />
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.code || !formData.content || createTemplate.isPending || updateTemplate.isPending}>{editingTemplate ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the template. Automation rules using this will stop working.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
