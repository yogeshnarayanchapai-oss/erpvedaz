import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, FileText, DollarSign, TrendingUp, TrendingDown, 
  Users, Package, Truck, Calculator, Download, Plus, Filter,
  BarChart3, PieChart, ClipboardList, Save, FileSpreadsheet
} from 'lucide-react';
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import { 
  useCompanyInfo, 
  useAuditSummary, 
  useMonthlySales, 
  useExpenseBreakdown,
  useAuditManualEntries,
  useSaveAuditSnapshot,
  AuditFilters 
} from '@/hooks/useAuditDashboard';
import { formatNPR } from '@/lib/currency';
import { AuditCompanyInfoEditable } from '@/components/audit/AuditCompanyInfoEditable';
import { AuditFinancialSummary } from '@/components/audit/AuditFinancialSummary';
import { AuditSalesChartNepali } from '@/components/audit/AuditSalesChartNepali';
import { AuditExpenseChartNepali } from '@/components/audit/AuditExpenseChartNepali';
import { AuditManualEntryFormNepali } from '@/components/audit/AuditManualEntryFormNepali';
import { AuditReportsSection } from '@/components/audit/AuditReportsSection';
import { AuditNotesSection } from '@/components/audit/AuditNotesSection';
import { AuditNepaliDateFilter } from '@/components/audit/AuditNepaliDateFilter';
import { AuditExportButtons } from '@/components/audit/AuditExportButtons';
import { AuditInventorySummary } from '@/components/audit/AuditInventorySummary';
import { AuditPayrollSummary } from '@/components/audit/AuditPayrollSummary';
import { AuditPurchaseSummary } from '@/components/audit/AuditPurchaseSummary';
import { AuditDataFlowDiagram } from '@/components/audit/AuditDataFlowDiagram';
import { formatBSDate } from '@/lib/nepaliDate';

const currentYear = new Date().getFullYear();
const fiscalYears = Array.from({ length: 5 }, (_, i) => `${currentYear - i}/${currentYear - i + 1}`);
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function AuditDashboard() {
  const [filters, setFilters] = useState<AuditFilters>({
    fiscalYear: fiscalYears[0],
    startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfYear(new Date()), 'yyyy-MM-dd'),
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const { data: companyInfo } = useCompanyInfo();
  const { data: summary, isLoading: summaryLoading } = useAuditSummary(filters);
  const { data: monthlySales } = useMonthlySales(filters);
  const { data: expenseBreakdown } = useExpenseBreakdown(filters);
  const { data: manualEntries } = useAuditManualEntries(filters);
  const saveSnapshot = useSaveAuditSnapshot();

  const handleQuarterChange = (quarter: string) => {
    if (quarter === 'all') {
      setFilters(prev => ({ 
        ...prev, 
        fiscalQuarter: undefined,
        startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfYear(new Date()), 'yyyy-MM-dd'),
      }));
      return;
    }
    const qNum = parseInt(quarter.replace('Q', '')) - 1;
    const year = new Date().getFullYear();
    const startDate = format(startOfQuarter(new Date(year, qNum * 3, 1)), 'yyyy-MM-dd');
    const endDate = format(endOfQuarter(new Date(year, qNum * 3, 1)), 'yyyy-MM-dd');
    setFilters(prev => ({ ...prev, fiscalQuarter: quarter, startDate, endDate }));
  };

  const handleSaveSnapshot = () => {
    saveSnapshot.mutate({
      name: `Audit Snapshot - ${filters.fiscalYear}`,
      data: { summary, monthlySales, expenseBreakdown, manualEntries },
      fiscalYear: filters.fiscalYear,
      fiscalQuarter: filters.fiscalQuarter,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit / Company Profile Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive audit-ready summary of company operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowManualEntry(true)}>
            <Plus className="w-4 h-4 mr-1" /> Manual Entry
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveSnapshot}>
            <Save className="w-4 h-4 mr-1" /> Save Snapshot
          </Button>
          <AuditExportButtons
            summary={summary}
            manualEntries={manualEntries}
            monthlySales={monthlySales}
            expenseBreakdown={expenseBreakdown}
            filters={filters}
            companyName={companyInfo?.company_name}
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select 
              value={filters.fiscalYear} 
              onValueChange={(v) => setFilters(prev => ({ ...prev, fiscalYear: v }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Fiscal Year" />
              </SelectTrigger>
              <SelectContent>
                {fiscalYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filters.fiscalQuarter || 'all'} 
              onValueChange={handleQuarterChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map(q => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <AuditCompanyInfoEditable companyInfo={companyInfo} canEdit={true} />
          <AuditFinancialSummary summary={summary} loading={summaryLoading} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AuditSalesChartNepali data={monthlySales || []} title="Monthly Sales (बिक्री)" />
            <AuditExpenseChartNepali data={expenseBreakdown || []} title="Expense Distribution (खर्च)" />
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Sales Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-semibold">{formatNPR(summary?.totalSales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Count</span>
                  <span className="font-semibold">{summary?.salesCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receivables</span>
                  <span className="font-semibold">{formatNPR(summary?.receivables || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-info" />
                  Purchase Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Purchase</span>
                  <span className="font-semibold">{formatNPR(summary?.totalPurchase || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Count</span>
                  <span className="font-semibold">{summary?.purchaseCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payables</span>
                  <span className="font-semibold">{formatNPR(summary?.payables || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-warning" />
                  Payroll Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Payroll</span>
                  <span className="font-semibold">{formatNPR(summary?.totalPayroll || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Inventory Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock Value</span>
                  <span className="font-semibold">{formatNPR(summary?.inventoryValue || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  Expense Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold">{formatNPR(summary?.totalExpenses || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-success" />
                  Cash & Bank
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Balance</span>
                  <span className="font-semibold">{formatNPR(summary?.cashBalance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Balance</span>
                  <span className="font-semibold">{formatNPR(summary?.bankBalance || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {manualEntries && manualEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Manual Audit Entries</CardTitle>
                <CardDescription>Manually added entries for audit purposes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-center p-2">In Audit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualEntries.map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="p-2">{formatBSDate(entry.date, 'short')}</td>
                          <td className="p-2">
                            <Badge variant="outline">{entry.category}</Badge>
                          </td>
                          <td className="p-2">{entry.description}</td>
                          <td className="p-2 text-right">{formatNPR(entry.amount)}</td>
                          <td className="p-2 text-center">
                            <Badge variant={entry.include_in_audit ? 'default' : 'secondary'}>
                              {entry.include_in_audit ? 'Yes' : 'No'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AuditSalesChartNepali data={monthlySales || []} title="Monthly Sales Trend" />
            <AuditExpenseChartNepali data={expenseBreakdown || []} title="Expense Distribution" />
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6">
          <AuditReportsSection filters={filters} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <AuditNotesSection />
        </TabsContent>
      </Tabs>

      {/* Manual Entry Modal with Nepali Date */}
      <AuditManualEntryFormNepali 
        open={showManualEntry} 
        onClose={() => setShowManualEntry(false)} 
      />
    </div>
  );
}
