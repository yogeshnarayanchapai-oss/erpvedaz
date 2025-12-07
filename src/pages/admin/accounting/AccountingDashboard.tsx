import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountingDashboard } from '@/hooks/useAccounting';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Receipt, AlertCircle, Users, ArrowRight } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function AccountingDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: dashboard, isLoading } = useAccountingDashboard(dateRange.startDate, dateRange.endDate);
  const { data: parties = [] } = usePartiesWithBalances();

  // Calculate party summaries
  const totalReceivablesFromParties = parties
    .filter(p => p.party_type === 'WHOLESALER' || p.party_type === 'BOTH')
    .reduce((sum, p) => sum + Math.max(0, p.current_balance), 0);

  const totalPayablesToParties = parties
    .filter(p => p.party_type === 'SUPPLIER' || p.party_type === 'BOTH')
    .reduce((sum, p) => sum + Math.max(0, -p.current_balance), 0);

  const netBalance = (dashboard?.cashBalance || 0) + (dashboard?.bankBalance || 0) + totalReceivablesFromParties - totalPayablesToParties;

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const stats = [
    {
      title: 'Cash in Hand',
      value: `NPR ${dashboard?.cashBalance.toLocaleString() || 0}`,
      icon: Wallet,
      color: 'text-green-600',
      link: '/admin/accounting/accounts',
    },
    {
      title: 'Bank Balance',
      value: `NPR ${dashboard?.bankBalance.toLocaleString() || 0}`,
      icon: CreditCard,
      color: 'text-blue-600',
      link: '/admin/accounting/accounts',
    },
    {
      title: "Today's Cash In",
      value: `NPR ${dashboard?.todayCashIn.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      link: '/admin/accounting/transactions?type=INCOME',
    },
    {
      title: "Today's Cash Out",
      value: `NPR ${dashboard?.todayCashOut.toLocaleString() || 0}`,
      icon: TrendingDown,
      color: 'text-red-600',
      link: '/admin/accounting/transactions?type=EXPENSE',
    },
    {
      title: 'Total Receivable',
      value: `NPR ${totalReceivablesFromParties.toLocaleString()}`,
      icon: Receipt,
      color: 'text-orange-600',
      description: 'From wholesalers',
      link: '/admin/accounting/receivables',
    },
    {
      title: 'Total Payable',
      value: `NPR ${totalPayablesToParties.toLocaleString()}`,
      icon: AlertCircle,
      color: 'text-purple-600',
      description: 'To suppliers',
      link: '/admin/accounting/payables',
    },
    {
      title: 'Net Balance',
      value: `NPR ${netBalance.toLocaleString()}`,
      icon: Users,
      color: netBalance >= 0 ? 'text-green-600' : 'text-red-600',
      description: 'Cash + Bank + Receivables - Payables',
      link: '/admin/accounting/accounts',
    },
    {
      title: 'Monthly Profit',
      value: `NPR ${dashboard?.monthlyProfit.toLocaleString() || 0}`,
      icon: DollarSign,
      color: dashboard && dashboard.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600',
      link: '/admin/accounting/transactions',
    },
  ];

  return (
    <div className="p-6 space-y-6">
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
            variant={dateRange.startDate === format(subDays(new Date(), 30), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setDateRange({
              startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            30 Days
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => stat.link && navigate(stat.link)}
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
              {stat.link && (
                <p className="text-xs text-primary flex items-center gap-1 mt-2">
                  View details <ArrowRight className="h-3 w-3" />
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline" onClick={() => navigate('/admin/accounting/deposit')}>
              <TrendingUp className="w-4 h-4 mr-2" /> New Deposit
            </Button>
            <Button className="w-full" variant="outline" onClick={() => navigate('/admin/accounting/expense')}>
              <TrendingDown className="w-4 h-4 mr-2" /> New Expense
            </Button>
            <Button className="w-full" variant="outline" onClick={() => navigate('/admin/accounting/transfer')}>
              <CreditCard className="w-4 h-4 mr-2" /> Transfer
            </Button>
            <Button className="w-full" variant="outline" onClick={() => navigate('/admin/accounting/transactions')}>
              <Receipt className="w-4 h-4 mr-2" /> View Transactions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Assets</span>
              <span className="font-semibold">NPR {((dashboard?.cashBalance || 0) + (dashboard?.bankBalance || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Net Receivables</span>
              <span className="font-semibold text-orange-600">NPR {dashboard?.totalReceivable.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Net Payables</span>
              <span className="font-semibold text-purple-600">NPR {dashboard?.totalPayable.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm font-semibold">Net Position</span>
              <span className={`font-bold ${(dashboard?.totalReceivable || 0) - (dashboard?.totalPayable || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                NPR {((dashboard?.totalReceivable || 0) - (dashboard?.totalPayable || 0)).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
