import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventoryActivityLogs } from '@/hooks/useInventoryActivityLogs';
import { Activity, ArrowDownCircle, ArrowUpCircle, Edit, Trash2, Package } from 'lucide-react';
import { Outlet } from 'react-router-dom';

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'CREATE':
      return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
    case 'UPDATE':
      return <Edit className="w-4 h-4 text-amber-600" />;
    case 'DELETE':
      return <Trash2 className="w-4 h-4 text-red-600" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
}

function getActionColor(actionType: string) {
  switch (actionType) {
    case 'CREATE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'UPDATE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function InventoryActivityLog() {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    actionType: 'all',
  });

  const { data: logs = [], isLoading } = useInventoryActivityLogs(filters);

  // Summary counts
  const createCount = logs.filter(l => l.action_type === 'CREATE').length;
  const updateCount = logs.filter(l => l.action_type === 'UPDATE').length;
  const deleteCount = logs.filter(l => l.action_type === 'DELETE').length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Inventory Activity Log</h1>
            <p className="text-muted-foreground">Permanent audit trail of all stock movement actions</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-2xl font-bold text-green-600">{createCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                  <Edit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Updated</p>
                  <p className="text-2xl font-bold text-amber-600">{updateCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                  <p className="text-2xl font-bold text-red-600">{deleteCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionType">Action Type</Label>
                <Select value={filters.actionType} onValueChange={(value) => setFilters({ ...filters, actionType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Created</SelectItem>
                    <SelectItem value="UPDATE">Updated</SelectItem>
                    <SelectItem value="DELETE">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                )}
                {!isLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionIcon(log.action_type)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.performed_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action_type)}>
                        {log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-sm">{log.description}</span>
                      {log.action_type === 'UPDATE' && log.old_values && log.new_values && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View changes
                          </summary>
                          <div className="mt-2 text-xs bg-muted p-2 rounded space-y-1">
                            {['qty', 'unit_cost', 'unit_price', 'movement_type', 'remark'].map(key => {
                              const oldVal = log.old_values?.[key];
                              const newVal = log.new_values?.[key];
                              if (oldVal !== newVal && (oldVal != null || newVal != null)) {
                                return (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span>{' '}
                                    <span className="text-red-600 line-through">{String(oldVal ?? '-')}</span>{' → '}
                                    <span className="text-green-600">{String(newVal ?? '-')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </details>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {log.qty ?? '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {log.amount ? `Rs ${log.amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.performer_name || 'System'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Outlet />
    </>
  );
}
