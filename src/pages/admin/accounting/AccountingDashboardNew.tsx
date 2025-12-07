import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAccountingDashboardMetrics, useNetWorthOverTime, useExpenseByCategory } from '@/hooks/useAccountingDashboardMetrics';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, AlertCircle, ArrowRight, Building, Scale } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AccountingDashboardNew() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [showNetWorthDetail, setShowNetWorthDetail] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useAccountingDashboardMetrics(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: netWorthData } = useNetWorthOverTime();
  const { data: expenseByCategory } = useExpenseByCategory(dateRange.startDate, dateRange.endDate);
  const { data: accounts = [] } = useActiveAccounts();

  // Calculate total balance from all accounts
  const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  if (metricsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const stats = [
    {
      title: 'Net Worth',
      value: `NPR ${metrics?.netWorth.toLocaleString() || 0}`,
      icon: Scale,
      color: (metrics?.netWorth || 0) >= 0 ? 'text-emerald-600' : 'text-destructive',
      description: `Assets: ${metrics?.totalAssets.toLocaleString() || 0} - Liabilities: ${metrics?.totalLiabilities.toLocaleString() || 0}`,
      onClick: () => setShowNetWorthDetail(true),
    },
    {
      title: 'Total Income',
      value: `NPR ${metrics?.totalIncome.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'text-success',
      description: `For ${dateRange.startDate} to ${dateRange.endDate}`,
      onClick: () => navigate('/inventory/daily-pl'),
    },
    {
      title: 'Total Expense',
      value: `NPR ${metrics?.totalExpense.toLocaleString() || 0}`,
      icon: TrendingDown,
      color: 'text-destructive',
      description: `For ${dateRange.startDate} to ${dateRange.endDate}`,
      onClick: () => navigate('/inventory/daily-pl'),
    },
    {
      title: 'Profit / Loss',
      value: `NPR ${metrics?.profitLoss.toLocaleString() || 0}`,
      icon: DollarSign,
      color: (metrics?.profitLoss || 0) >= 0 ? 'text-success' : 'text-destructive',
      description: 'Income - Expense',
      onClick: () => navigate('/inventory/daily-pl'),
    },
    {
      title: 'Receivable Outstanding',
      value: `NPR ${metrics?.receivableOutstanding.toLocaleString() || 0}`,
      icon: CreditCard,
      color: 'text-warning',
      description: 'Amount to collect from parties',
      onClick: () => navigate('/admin/accounting/receivables'),
    },
    {
      title: 'Payable Outstanding',
      value: `NPR ${metrics?.payableOutstanding.toLocaleString() || 0}`,
      icon: AlertCircle,
      color: 'text-primary',
      description: 'Amount to pay to parties',
      onClick: () => navigate('/admin/accounting/payables'),
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Net Worth Detail Dialog */}
      <Dialog open={showNetWorthDetail} onOpenChange={setShowNetWorthDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Net Worth Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-emerald-50 dark:bg-emerald-950/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-xl font-bold text-emerald-600">
                    NPR {metrics?.totalAssets.toLocaleString() || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Liabilities</p>
                  <p className="text-xl font-bold text-destructive">
                    NPR {metrics?.totalLiabilities.toLocaleString() || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 dark:bg-blue-950/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Net Worth</p>
                  <p className={`text-xl font-bold ${(metrics?.netWorth || 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    NPR {metrics?.netWorth.toLocaleString() || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Asset Accounts */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-600" />
                Asset Accounts
              </h4>
              <div className="space-y-2">
                {metrics?.assetAccounts?.length ? metrics.assetAccounts.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center p-3 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    </div>
                    <p className="font-semibold text-emerald-600">
                      {acc.currency} {acc.current_balance?.toLocaleString() || 0}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No asset accounts found</p>
                )}
              </div>
            </div>

            {/* Liability Accounts */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Liability Accounts
              </h4>
              <div className="space-y-2">
                {metrics?.liabilityAccounts?.length ? metrics.liabilityAccounts.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center p-3 border rounded-lg bg-red-50/50 dark:bg-red-950/20">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    </div>
                    <p className="font-semibold text-destructive">
                      {acc.currency} {Math.abs(acc.current_balance || 0).toLocaleString()}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No liability accounts found</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounting Dashboard</h1>
          <p className="text-muted-foreground">Complete financial overview</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateRange.startDate === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setDateRange({
              startDate: format(new Date(), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            Today
          </Button>
          <Button
            variant={dateRange.startDate === format(subDays(new Date(), 7), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setDateRange({
              startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            7 Days
          </Button>
          <Button
            variant={dateRange.startDate === format(startOfMonth(new Date()), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setDateRange({
              startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
              endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
            })}
          >
            This Month
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              {stat.description && (
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              )}
              <p className="text-xs text-primary flex items-center gap-1 mt-2">
                View details <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Net Worth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={netWorthData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseByCategory || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Account Balances</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/accounting/accounts')}>
            Manage Accounts
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{account.type}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${account.current_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {account.currency} {account.current_balance.toLocaleString()}
                  </p>
                  {account.account_number && (
                    <p className="text-xs text-muted-foreground">{account.account_number}</p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Total Balance Row */}
            <div className="flex justify-between items-center p-3 border-2 border-primary/50 rounded-lg bg-primary/5">
              <div>
                <p className="font-bold">Total Balance</p>
                <p className="text-sm text-muted-foreground">Sum of all accounts</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-xl ${totalAccountBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  NPR {totalAccountBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
