import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { useLeaveQuotas, useLeaveSettings, useCreateLeaveQuota, useUpdateLeaveQuota, useDeleteLeaveQuota, useUpdateLeaveSettings, LeaveQuota } from '@/hooks/useLeaveQuota';
import { useEmployees } from '@/hooks/useHRM';
import { format, startOfMonth, addMonths } from 'date-fns';

export default function HRMLeaveQuota() {
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editQuota, setEditQuota] = useState<LeaveQuota | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    max_days: '2',
  });
  const [settingsForm, setSettingsForm] = useState({
    default_monthly_limit: '2',
    apply_default_if_no_quota: true,
  });

  const { data: quotas, isLoading } = useLeaveQuotas(selectedMonth);
  const { data: settings } = useLeaveSettings();
  const { data: employees } = useEmployees();
  const createQuota = useCreateLeaveQuota();
  const updateQuota = useUpdateLeaveQuota();
  const deleteQuota = useDeleteLeaveQuota();
  const updateSettings = useUpdateLeaveSettings();

  // Generate month options
  const monthOptions = useMemo(() => {
    const months = [];
    const start = addMonths(new Date(), -6);
    for (let i = 0; i < 12; i++) {
      const date = addMonths(start, i);
      months.push({
        value: format(startOfMonth(date), 'yyyy-MM-dd'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return months;
  }, []);

  // Sync settings form with data
  useMemo(() => {
    if (settings) {
      setSettingsForm({
        default_monthly_limit: settings.default_monthly_limit?.toString() || '2',
        apply_default_if_no_quota: settings.apply_default_if_no_quota,
      });
    }
  }, [settings]);

  const resetForm = () => {
    setForm({ employee_id: '', max_days: '2' });
    setEditQuota(null);
  };

  const handleSubmit = async () => {
    const data = {
      employee_id: form.employee_id,
      month_start: selectedMonth,
      max_days: parseInt(form.max_days),
    };

    if (editQuota) {
      await updateQuota.mutateAsync({ id: editQuota.id, ...data });
    } else {
      await createQuota.mutateAsync(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync({
      default_monthly_limit: parseInt(settingsForm.default_monthly_limit) || null,
      apply_default_if_no_quota: settingsForm.apply_default_if_no_quota,
    });
    setSettingsDialogOpen(false);
  };

  const openEdit = (quota: LeaveQuota) => {
    setEditQuota(quota);
    setForm({
      employee_id: quota.employee_id,
      max_days: quota.max_days.toString(),
    });
    setDialogOpen(true);
  };

  // Get employees without quota for this month
  const employeesWithoutQuota = employees?.filter(
    emp => emp.status === 'Active' && !quotas?.some(q => q.employee_id === emp.id)
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monthly Leave Quota</h1>
            <p className="text-muted-foreground">Set monthly leave limits for employees</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Settings className="w-4 h-4 mr-2" />Settings</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Default Monthly Limit (days)</Label>
                    <Input
                      type="number"
                      value={settingsForm.default_monthly_limit}
                      onChange={e => setSettingsForm({ ...settingsForm, default_monthly_limit: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied when no specific quota is set for an employee
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Apply Default If No Quota</Label>
                      <p className="text-xs text-muted-foreground">
                        Use default limit when employee has no specific quota
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.apply_default_if_no_quota}
                      onCheckedChange={v => setSettingsForm({ ...settingsForm, apply_default_if_no_quota: v })}
                    />
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full">Save Settings</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Set Quota</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editQuota ? 'Edit Leave Quota' : 'Set Leave Quota'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee *</Label>
                    <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {(editQuota ? employees : employeesWithoutQuota)?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Days for {format(new Date(selectedMonth), 'MMMM yyyy')} *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="31"
                      value={form.max_days}
                      onChange={e => setForm({ ...form, max_days: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={!form.employee_id || !form.max_days} className="w-full">
                    {editQuota ? 'Update' : 'Set'} Quota
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Month Selector & Info */}
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            Default limit: <strong>{settings?.default_monthly_limit || 'Not set'}</strong> days
            {settings?.apply_default_if_no_quota && ' (applied if no quota)'}
          </div>
        </div>

        {/* Quotas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Quotas for {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Max Days</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
                ) : quotas?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center">No quotas set for this month</TableCell></TableRow>
                ) : quotas?.map(quota => (
                  <TableRow key={quota.id}>
                    <TableCell>{quota.employees?.full_name}</TableCell>
                    <TableCell><strong>{quota.max_days}</strong> days</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(quota)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteQuota.mutate(quota.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Employees without specific quota */}
        {employeesWithoutQuota && employeesWithoutQuota.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Employees Using Default Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {employeesWithoutQuota.map(emp => (
                  <span key={emp.id} className="px-2 py-1 bg-muted rounded text-sm">
                    {emp.full_name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
