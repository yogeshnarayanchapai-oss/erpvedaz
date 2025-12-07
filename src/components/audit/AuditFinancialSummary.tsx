import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, TrendingUp, TrendingDown, Calculator, 
  Wallet, Building, Receipt, CreditCard 
} from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { AuditSummary } from '@/hooks/useAuditDashboard';

interface AuditFinancialSummaryProps {
  summary?: AuditSummary;
  loading?: boolean;
}

export function AuditFinancialSummary({ summary, loading }: AuditFinancialSummaryProps) {
  const cards = [
    {
      title: 'Total Sales',
      value: summary?.totalSales || 0,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Expenses',
      value: summary?.totalExpenses || 0,
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Total Payroll',
      value: summary?.totalPayroll || 0,
      icon: Calculator,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Net Profit/Loss',
      value: summary?.profitLoss || 0,
      icon: DollarSign,
      color: (summary?.profitLoss || 0) >= 0 ? 'text-success' : 'text-destructive',
      bgColor: (summary?.profitLoss || 0) >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      title: 'Cash Balance',
      value: summary?.cashBalance || 0,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Bank Balance',
      value: summary?.bankBalance || 0,
      icon: Building,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Receivables',
      value: summary?.receivables || 0,
      icon: Receipt,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Payables',
      value: summary?.payables || 0,
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className={`text-xl font-bold ${card.color}`}>
                  {formatNPR(card.value)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
