import { useNavigate } from 'react-router-dom';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import {
  BarChart3, TrendingUp, DollarSign, FileText, ArrowUpDown,
  BookOpen, Landmark, Activity, Package, Users, Phone,
  Truck, GitBranch, Brain
} from 'lucide-react';

const reportCards = [
  {
    title: 'Business Control Panel',
    description: 'Product-wise sales, marketing, costs & profit analysis',
    icon: BarChart3,
    color: 'text-chart-1',
    bgColor: 'bg-chart-1/10',
    url: '/admin/reports/business-control',
  },
  {
    title: 'Daily Performance',
    description: 'Daily P&L, product daybook & sales breakdown',
    icon: TrendingUp,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    url: '/admin/reports/daily-performance',
  },
  {
    title: 'Profit & Loss',
    description: 'Revenue, costs, ads spend & net profit analysis',
    icon: DollarSign,
    color: 'text-success',
    bgColor: 'bg-success/10',
    url: '/admin/reports/profit-loss',
  },
  {
    title: 'Sales Report',
    description: 'Order revenue, product sales & trends',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    url: '/admin/reports/sales',
  },
  {
    title: 'Income & Expense',
    description: 'All income & expense transactions breakdown',
    icon: ArrowUpDown,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    url: '/admin/reports/income-expense',
  },
  {
    title: 'Day Book',
    description: 'Daily transaction journal with all entries',
    icon: BookOpen,
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    url: '/admin/reports/daybook',
  },
  {
    title: 'Bank & Party Statement',
    description: 'Bank ledger & party account statements',
    icon: Landmark,
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
    url: '/admin/reports/bank-party',
  },
  {
    title: 'Business Status',
    description: 'Overall business health, KPIs & summary',
    icon: Activity,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    url: '/admin/reports/business-status',
  },
  {
    title: 'Product Report',
    description: 'Product-wise leads, orders, revenue & conversion',
    icon: Package,
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
    url: '/admin/reports/products',
  },
  {
    title: 'Leads Report',
    description: 'Lead generation staff performance & metrics',
    icon: Users,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    url: '/admin/reports/leads',
  },
  {
    title: 'Calling Report',
    description: 'Calling team orders, conversion & sales',
    icon: Phone,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    url: '/admin/reports/calling',
  },
  {
    title: 'Logistics Report',
    description: 'Inside/Outside valley, courier & branch summary',
    icon: Truck,
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/10',
    url: '/admin/reports/logistics',
  },
  {
    title: 'Source Analysis',
    description: 'Lead source performance & conversion rates',
    icon: GitBranch,
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
    url: '/admin/reports/source-analysis',
  },
  {
    title: 'AI Summary',
    description: 'AI-powered business insights & analysis',
    icon: Brain,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    url: '/admin/reports/ai-summary',
  },
];

export default function ReportsHub() {
  const navigate = useNavigate();
  const { effectiveRole } = useEffectiveRole();
  const visibleReportCards = (effectiveRole as string) === 'SALES_MANAGER'
    ? reportCards.filter((card) => [
        '/admin/reports/sales',
        '/admin/reports/products',
        '/admin/reports/leads',
        '/admin/reports/calling',
        '/admin/reports/source-analysis',
        '/admin/reports/ai-summary',
      ].includes(card.url))
    : reportCards;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">All your business reports in one place</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleReportCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => navigate(card.url)}
              className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 text-left"
            >
              <div className={`p-3 rounded-lg ${card.bgColor} shrink-0`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
