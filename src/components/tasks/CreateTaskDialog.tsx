import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateTask, useUpdateTask, TaskPriority, Task } from '@/hooks/useTasks';
import { useStaff } from '@/hooks/useStaff';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  due_date: z.string().min(1, 'Due date is required'),
  assigned_to_user_ids: z.array(z.string()).min(1, 'Please select at least one employee'),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTaskDialogProps {
  editTask?: Task | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTaskDialog({ editTask, open: controlledOpen, onOpenChange }: CreateTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: allStaff } = useStaff();
  const { data: managerStaff } = useStaff('MANAGER');
  const [searchQuery, setSearchQuery] = useState('');

  const staff = useMemo(() => {
    const allUsers = [...(allStaff || [])];
    managerStaff?.forEach(manager => {
      if (!allUsers.find(u => u.id === manager.id)) {
        allUsers.push(manager);
      }
    });
    return allUsers.sort((a, b) => a.name.localeCompare(b.name));
  }, [allStaff, managerStaff]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staff;
    return staff?.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [staff, searchQuery]);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const isEditMode = !!editTask;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      due_date: new Date().toISOString().split('T')[0],
      assigned_to_user_ids: [],
    },
  });

  useEffect(() => {
    if (editTask) {
      form.reset({
        title: editTask.title,
        description: editTask.description || '',
        priority: editTask.priority,
        due_date: editTask.due_date,
        assigned_to_user_ids: editTask.assigned_to_user_id ? [editTask.assigned_to_user_id] : [],
      });
    } else {
      form.reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: new Date().toISOString().split('T')[0],
        assigned_to_user_ids: [],
      });
    }
  }, [editTask, form]);

  const onSubmit = async (data: FormData) => {
    if (isEditMode && editTask) {
      // Edit mode: update single task with first selected user
      await updateTask.mutateAsync({
        taskId: editTask.id,
        updates: {
          title: data.title,
          description: data.description,
          priority: data.priority as TaskPriority,
          due_date: data.due_date,
          assigned_to_user_id: data.assigned_to_user_ids[0],
        },
      });
    } else {
      // Create mode: create one task per selected staff member
      const promises = data.assigned_to_user_ids.map(userId =>
        createTask.mutateAsync({
          title: data.title,
          description: data.description,
          priority: data.priority as TaskPriority,
          due_date: data.due_date,
          assigned_to_user_id: userId,
        })
      );
      await Promise.all(promises);
      if (data.assigned_to_user_ids.length > 1) {
        toast.success(`Task created for ${data.assigned_to_user_ids.length} staff members`);
      }
    }
    setOpen(false);
    if (!isEditMode) {
      form.reset();
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  const selectedIds = form.watch('assigned_to_user_ids');

  const toggleStaff = (id: string) => {
    const current = form.getValues('assigned_to_user_ids');
    if (current.includes(id)) {
      form.setValue('assigned_to_user_ids', current.filter(v => v !== id), { shouldValidate: true });
    } else {
      form.setValue('assigned_to_user_ids', [...current, id], { shouldValidate: true });
    }
  };

  const removeStaff = (id: string) => {
    const current = form.getValues('assigned_to_user_ids');
    form.setValue('assigned_to_user_ids', current.filter(v => v !== id), { shouldValidate: true });
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter task title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter task description (optional)" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="assigned_to_user_ids"
            render={() => (
              <FormItem>
                <FormLabel>Assign To {!isEditMode && <span className="text-muted-foreground text-xs">(multi-select)</span>}</FormLabel>
                {/* Selected badges */}
                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {selectedIds.map(id => {
                      const s = staff?.find(st => st.id === id);
                      return s ? (
                        <Badge key={id} variant="secondary" className="text-xs gap-1 pr-1">
                          {s.name}
                          <button type="button" onClick={() => removeStaff(id)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                {/* Staff search + checklist */}
                <div className="border rounded-md">
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="border-0 border-b rounded-none h-8 text-sm focus-visible:ring-0"
                  />
                  <ScrollArea className="h-[140px]">
                    <div className="p-1">
                      {filteredStaff?.map(s => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedIds.includes(s.id)}
                            onCheckedChange={() => toggleStaff(s.id)}
                          />
                          <span className="truncate">{s.name}</span>
                        </label>
                      ))}
                      {filteredStaff?.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2 text-center">No staff found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : `Create Task${selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}`)}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          Create Task
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
