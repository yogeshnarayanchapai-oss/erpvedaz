import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Database, FileText, ArrowRight } from 'lucide-react';

export function AuditDataFlowDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Data Flow: Operational → Audit Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Sales Flow */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-xs font-medium text-success">Orders Module</p>
              <p className="text-sm">Delivered Orders</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium">Filter</p>
              <p className="text-sm">Include in Audit = Yes</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary">Sales Summary</p>
              <p className="text-sm">Total Sales, Invoice Count</p>
            </div>
          </div>

          {/* Purchase Flow */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 rounded-lg bg-info/10 border border-info/20">
              <p className="text-xs font-medium text-info">Stock Movements</p>
              <p className="text-sm">IN Movements</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium">Filter</p>
              <p className="text-sm">Include in Audit = Yes</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary">Purchase Summary</p>
              <p className="text-sm">Total Purchase, Vendors</p>
            </div>
          </div>

          {/* Payroll Flow */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs font-medium text-warning">Office Expenses</p>
              <p className="text-sm">Salary Category</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium">Filter</p>
              <p className="text-sm">Include in Audit = Yes</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary">Payroll Summary</p>
              <p className="text-sm">Salaries, Bonuses</p>
            </div>
          </div>

          {/* Manual Entry Flow */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs font-medium text-purple-500">Manual Entry</p>
              <p className="text-sm">External Data Input</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium">Toggle</p>
              <p className="text-sm">Include in Audit = Yes/No</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary">Audit Dashboard</p>
              <p className="text-sm">Combined Reports</p>
            </div>
          </div>

          {/* Legend */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Legend</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span>Operational Data (Auto-fetched)</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                <span>Manual Entries (User Input)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>Include in Audit Toggle</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
