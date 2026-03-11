import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { useStaff } from '@/hooks/useStaff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function LeadsReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(today), to: endOfDay(today) });
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [] } = useLeads({ dateFrom, dateTo });
  const { data: leadsStaff = [] } = useStaff('LEADS');

  const leadsPerformance = useMemo(() => {
    return leadsStaff.map(staff => {
      const staffLeads = leads.filter(l => l.created_by_user_id === staff.id);
      const assigned = staffLeads.filter(l => l.current_team === 'CALLING').length;
      const remaining = staffLeads.filter(l => l.current_team === 'LEADS' && !l.assigned_to_user_id).length;
      return { name: staff.name, newLeads: staffLeads.length, assigned, remaining };
    }).filter(s => s.newLeads > 0).sort((a, b) => b.newLeads - a.newLeads);
  }, [leadsStaff, leads]);

  const totalLeads = leads.length;
  const confirmed = leads.filter(l => l.status === 'CONFIRMED').length;
  const cancelled = leads.filter(l => l.status === 'CANCELLED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Leads Report</h1>
            <p className="text-muted-foreground">Lead generation staff performance & metrics</p>
          </div>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Leads</p><p className="text-2xl font-bold">{totalLeads}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Confirmed</p><p className="text-2xl font-bold text-success">{confirmed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Cancelled</p><p className="text-2xl font-bold text-destructive">{cancelled}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Staff-wise Lead Generation</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="newLeads" fill="hsl(var(--chart-1))" name="New Leads" />
              <Bar dataKey="assigned" fill="hsl(var(--chart-2))" name="Assigned" />
              <Bar dataKey="remaining" fill="hsl(var(--chart-3))" name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Staff Performance Table</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">New Leads</TableHead>
                <TableHead className="text-right">Assigned to Calling</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsPerformance.map(s => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.newLeads}</TableCell>
                  <TableCell className="text-right">{s.assigned}</TableCell>
                  <TableCell className="text-right">{s.remaining}</TableCell>
                </TableRow>
              ))}
              {leadsPerformance.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
