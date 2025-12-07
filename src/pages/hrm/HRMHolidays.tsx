import { useState, useMemo } from 'react';
import { useOfficeHolidays, useCreateOfficeHoliday, useUpdateOfficeHoliday, useDeleteOfficeHoliday } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Pencil, Trash2, CalendarDays, List } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliCalendar, CalendarEvent } from '@/components/NepaliCalendar';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { format } from 'date-fns';

export default function HRMHolidays() {
  const { data: holidays = [], isLoading } = useOfficeHolidays();
  const createHoliday = useCreateOfficeHoliday();
  const updateHoliday = useUpdateOfficeHoliday();
  const deleteHoliday = useDeleteOfficeHoliday();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    date: '',
    title: '',
    description: '',
    holiday_type: 'Company' as 'Public' | 'Company' | 'Event',
    is_office_closed: true,
  });

  const resetForm = () => {
    setForm({ date: '', title: '', description: '', holiday_type: 'Company', is_office_closed: true });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, description: form.description || null };
    if (editing) {
      await updateHoliday.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createHoliday.mutateAsync(payload);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (h: any) => {
    setEditing(h);
    setForm({
      date: h.date,
      title: h.title,
      description: h.description || '',
      holiday_type: h.holiday_type,
      is_office_closed: h.is_office_closed,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this holiday?')) await deleteHoliday.mutateAsync(id);
  };

  const typeColors: Record<string, string> = {
    Public: 'bg-success/10 text-success',
    Company: 'bg-primary/10 text-primary',
    Event: 'bg-warning/10 text-warning',
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Convert holidays to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return holidays.map(h => ({
      date: h.date,
      title: h.title,
      type: h.holiday_type === 'Event' ? 'event' : 'holiday',
    }));
  }, [holidays]);

  const handleCalendarDateClick = (bsDate: { year: number; month: number; day: number }, adDate: Date) => {
    setSelectedDate(adDate);
    setForm(prev => ({ ...prev, date: format(adDate, 'yyyy-MM-dd') }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Office Holidays & Events</h1>
          <p className="text-muted-foreground">Manage holidays and company events</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Holiday</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <NepaliDatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} placeholder="Select date" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.holiday_type} onValueChange={(v) => setForm({ ...form, holiday_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public Holiday</SelectItem>
                      <SelectItem value="Company">Company Holiday</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_office_closed} onCheckedChange={(v) => setForm({ ...form, is_office_closed: v })} />
                <Label>Office Closed</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createHoliday.isPending || updateHoliday.isPending}>{editing ? 'Update' : 'Create'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <NepaliCalendar 
                events={calendarEvents}
                selectedDate={selectedDate}
                onDateClick={handleCalendarDateClick}
              />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Upcoming Holidays</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {holidays
                    .filter(h => new Date(h.date) >= new Date())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 5)
                    .map(h => (
                      <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{h.title}</p>
                          <p className="text-xs text-muted-foreground"><FormattedDate date={h.date} /></p>
                        </div>
                        <Badge variant="outline" className={typeColors[h.holiday_type]}>{h.holiday_type}</Badge>
                      </div>
                    ))}
                  {holidays.filter(h => new Date(h.date) >= new Date()).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming holidays</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Holidays & Events</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Office Closed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium"><FormattedDate date={h.date} /></TableCell>
                      <TableCell>{h.title}</TableCell>
                      <TableCell><Badge variant="outline" className={typeColors[h.holiday_type]}>{h.holiday_type}</Badge></TableCell>
                      <TableCell>{h.is_office_closed ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {holidays.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No holidays'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
