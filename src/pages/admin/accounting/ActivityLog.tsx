import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAccountingActivityLogs } from '@/hooks/useAccountingActivityLogs';
import { format, subDays } from 'date-fns';
import { Activity, ArrowDownCircle, ArrowUpCircle, Edit, ArrowRightLeft, Trash2 } from 'lucide-react';

export default function ActivityLog() {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    actionType: 'all',
  });

  const { data: logs = [], isLoading } = useAccountingActivityLogs(filters);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'DEPOSIT':
        return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
      case 'EXPENSE':
        return <ArrowUpCircle className="w-4 h-4 text-red-600" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'EDIT':
        return <Edit className="w-4 h-4 text-amber-600" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'DEPOSIT':
        return 'bg-green-100 text-green-800';
      case 'EXPENSE':
        return 'bg-red-100 text-red-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      case 'EDIT':
        return 'bg-amber-100 text-amber-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Accounting Activity Log</h1>
          <p className="text-muted-foreground">Track all deposits, expenses, and transaction edits</p>
        </div>
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
                  <SelectItem value="DEPOSIT">Deposits</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                  <SelectItem value="TRANSFER">Transfers</SelectItem>
                  <SelectItem value="EDIT">Edits</SelectItem>
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
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              )}
              {!isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No activity logs found
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{getActionIcon(log.action_type)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(log.performed_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action_type)}>
                      {log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="text-sm">{log.description}</span>
                    {log.old_values && log.new_values && (
                      <details className="mt-1">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View changes
                        </summary>
                        <div className="mt-2 text-xs bg-muted p-2 rounded space-y-1">
                          {Object.keys(log.new_values).map(key => {
                            const oldVal = log.old_values?.[key];
                            const newVal = log.new_values?.[key];
                            if (oldVal !== newVal) {
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
                    {log.amount ? `NPR ${log.amount.toLocaleString()}` : '-'}
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
  );
}
