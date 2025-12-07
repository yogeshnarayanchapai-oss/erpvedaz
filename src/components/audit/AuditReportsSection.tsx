import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Receipt, CreditCard, TrendingUp, Package, 
  Calculator, BarChart3, Settings, Download 
} from 'lucide-react';
import { AuditFilters } from '@/hooks/useAuditDashboard';

interface AuditReportsSectionProps {
  filters: AuditFilters;
}

const reports = [
  {
    id: 'accounting',
    name: 'Accounting Report',
    description: 'Complete ledger with all transactions',
    icon: Calculator,
    color: 'text-primary',
  },
  {
    id: 'receivable',
    name: 'Receivable Report',
    description: 'Outstanding amounts from customers',
    icon: Receipt,
    color: 'text-success',
  },
  {
    id: 'payable',
    name: 'Payable Report',
    description: 'Outstanding amounts to suppliers',
    icon: CreditCard,
    color: 'text-warning',
  },
  {
    id: 'sales',
    name: 'Sales Report',
    description: 'All sales transactions and invoices',
    icon: TrendingUp,
    color: 'text-success',
  },
  {
    id: 'purchase',
    name: 'Purchase Report',
    description: 'All purchase transactions and bills',
    icon: Package,
    color: 'text-info',
  },
  {
    id: 'tax',
    name: 'Tax Report',
    description: 'VAT/Tax summary for filing',
    icon: FileText,
    color: 'text-destructive',
  },
  {
    id: 'inventory',
    name: 'Inventory Report',
    description: 'Stock levels and movements',
    icon: Package,
    color: 'text-primary',
  },
  {
    id: 'analytics',
    name: 'Analytics Report',
    description: 'Business performance metrics',
    icon: BarChart3,
    color: 'text-info',
  },
  {
    id: 'system',
    name: 'System Audit',
    description: 'User actions and system logs',
    icon: Settings,
    color: 'text-muted-foreground',
  },
];

export function AuditReportsSection({ filters }: AuditReportsSectionProps) {
  const handleGenerateReport = (reportId: string) => {
    // TODO: Implement report generation
    alert(`Generating ${reportId} report for ${filters.fiscalYear}`);
  };

  const handleDownloadReport = (reportId: string, format: 'pdf' | 'excel') => {
    // TODO: Implement report download
    alert(`Downloading ${reportId} report as ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Audit Reports</h2>
          <p className="text-sm text-muted-foreground">
            Generate and download audit-ready reports for {filters.fiscalYear}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <report.icon className={`w-5 h-5 ${report.color}`} />
                  <CardTitle className="text-base">{report.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {filters.fiscalYear}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleGenerateReport(report.id)}
                >
                  Generate
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDownloadReport(report.id, 'pdf')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
