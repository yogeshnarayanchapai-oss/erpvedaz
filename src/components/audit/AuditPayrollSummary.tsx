import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wallet, TrendingUp } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuditFilters } from '@/hooks/useAuditDashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditPayrollSummaryProps {
  filters: AuditFilters;
}

export function AuditPayrollSummary({ filters }: AuditPayrollSummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-payroll-summary', filters],
    queryFn: async () => {
      const { startDate, endDate } = filters;

      // Get salary expenses
      const { data: salaryData } = await supabase
        .from('office_expenses')
        .select('amount, category')
        .eq('category', 'Salary')
        .gte('date', startDate || '2020-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0]);

      const totalSalary = salaryData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const salaryCount = salaryData?.length || 0;

      // Get bonus/allowance expenses
      const { data: bonusData } = await supabase
        .from('office_expenses')
        .select('amount')
        .in('category', ['Bonus', 'Allowance', 'Incentive'])
        .gte('date', startDate || '2020-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0]);

      const totalBonus = bonusData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Get employee count
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      // Get attendance stats
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('status')
        .gte('date', startDate || '2020-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0]);

      const presentDays = attendanceData?.filter(a => a.status === 'Present').length || 0;
      const absentDays = attendanceData?.filter(a => a.status === 'Absent').length || 0;

      return {
        totalSalary,
        salaryCount,
        totalBonus,
        employeeCount: employeeCount || 0,
        totalPayroll: totalSalary + totalBonus,
        presentDays,
        absentDays,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Payroll Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-warning" />
          Payroll Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-warning/10">
            <div className="flex items-center gap-2 text-warning">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Total Payroll</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatNPR(data?.totalPayroll || 0)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Active Employees</p>
            <p className="text-xl font-bold mt-1">{data?.employeeCount || 0}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salaries</span>
            <span className="font-medium">{formatNPR(data?.totalSalary || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bonus/Allowances</span>
            <span className="font-medium">{formatNPR(data?.totalBonus || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Count</span>
            <span className="font-medium">{data?.salaryCount || 0}</span>
          </div>
        </div>

        {(data?.presentDays || 0) + (data?.absentDays || 0) > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">Attendance Overview</p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span>Present: {data?.presentDays}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span>Absent: {data?.absentDays}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
