import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBirthdayCheck } from '@/hooks/useBirthdayCheck';
import { BirthdayBanner } from '@/components/hrm/BirthdayBanner';
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
    .filter(p => p.party_type === 'CUSTOMER' || p.party_type === 'BOTH')
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Accounting Dashboard</h1>
          <p className="text-sm text-muted-foreground">Complete financial overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={dateRange.startDate === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setDateRange({
              startDate: format(new Date(), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant={dateRange.startDate === format(subDays(new Date(), 7), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setDateRange({
              startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            7 Days
          </Button>
          <Button
            size="sm"
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

      {/* Stats - Mobile: 2 cols, Tablet: 2 cols, Desktop: 4 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => stat.link && navigate(stat.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate pr-2">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color} shrink-0`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className={`text-base md:text-2xl font-bold ${stat.color} truncate`}>
                {stat.value}
              </div>
              {stat.description && (
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">{stat.description}</p>
              )}
              {stat.link && (
                <p className="text-[10px] md:text-xs text-primary flex items-center gap-1 mt-1 md:mt-2">
                  View <ArrowRight className="h-3 w-3" />
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => navigate('/admin/accounting/deposit')}>
              <TrendingUp className="w-4 h-4 mr-2" /> New Deposit
            </Button>
            <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => navigate('/admin/accounting/expense')}>
              <TrendingDown className="w-4 h-4 mr-2" /> New Expense
            </Button>
            <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => navigate('/admin/accounting/transfer')}>
              <CreditCard className="w-4 h-4 mr-2" /> Transfer
            </Button>
            <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => navigate('/admin/accounting/transactions')}>
              <Receipt className="w-4 h-4 mr-2" /> View Transactions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Financial Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Assets</span>
              <span className="font-semibold">NPR {((dashboard?.cashBalance || 0) + (dashboard?.bankBalance || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Net Receivables</span>
              <span className="font-semibold text-orange-600">NPR {dashboard?.totalReceivable.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Net Payables</span>
              <span className="font-semibold text-purple-600">NPR {dashboard?.totalPayable.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-3 md:pt-4 border-t text-sm">
              <span className="font-semibold">Net Position</span>
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
