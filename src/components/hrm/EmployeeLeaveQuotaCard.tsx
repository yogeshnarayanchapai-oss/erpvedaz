import { CalendarDays } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeLeaveQuota, useLeaveSettings } from '@/hooks/useLeaveQuota';
import { useLeaveRequests } from '@/hooks/useHRM';

interface EmployeeLeaveQuotaCardProps {
  employeeId: string;
}

export function EmployeeLeaveQuotaCard({ employeeId }: EmployeeLeaveQuotaCardProps) {
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: quota, isLoading: quotaLoading } = useEmployeeLeaveQuota(employeeId, currentMonthStart);
  const { data: settings, isLoading: settingsLoading } = useLeaveSettings();
  const { data: leaveRequests, isLoading: leaveLoading } = useLeaveRequests({ employeeId });

  const isLoading = quotaLoading || settingsLoading || leaveLoading;

  // Calculate used leaves this month
  const usedLeavesThisMonth = leaveRequests?.filter(l => {
    const leaveDate = new Date(l.from_date);
    const monthStart = startOfMonth(new Date());
    return leaveDate >= monthStart && (l.status === 'Approved' || l.status === 'Pending');
  }).reduce((sum, l) => sum + l.total_days, 0) || 0;

  // Get max days from quota or settings
  const maxDays = quota?.max_days ?? (settings?.apply_default_if_no_quota ? settings?.default_monthly_limit : null);

  const remainingDays = maxDays ? Math.max(0, maxDays - usedLeavesThisMonth) : null;
  const usagePercent = maxDays ? Math.min(100, (usedLeavesThisMonth / maxDays) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Leave Quota</CardTitle>
        </div>
        <CardDescription>
          Current month leave allowance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : maxDays !== null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {format(new Date(), 'MMMM yyyy')}
              </span>
              <Badge variant={remainingDays && remainingDays > 0 ? 'outline' : 'destructive'}>
                {remainingDays} days remaining
              </Badge>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{maxDays}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{usedLeavesThisMonth}</p>
                <p className="text-xs text-muted-foreground">Used</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{remainingDays}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No leave quota set for this month
          </div>
        )}
      </CardContent>
    </Card>
  );
}
