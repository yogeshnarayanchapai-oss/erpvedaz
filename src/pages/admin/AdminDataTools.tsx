import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, Shield, Download, FileSpreadsheet, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { LeadSourcesManagement } from '@/components/admin/LeadSourcesManagement';
import { OrderCopyFormatEditor } from '@/components/admin/OrderCopyFormatEditor';

interface ResetResult {
  table_name: string;
  rows_deleted: number;
}

export default function AdminDataTools() {
  const { profile } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [resetResults, setResetResults] = useState<ResetResult[] | null>(null);
  const [backupComplete, setBackupComplete] = useState(false);

  // Only ADMIN can access this
  if (profile?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access data management tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const exportTableToExcel = async (tableName: string, displayName: string) => {
    setExportingTable(tableName);
    try {
      // Use type assertion for dynamic table access
      const { data, error } = await (supabase.from(tableName as any).select('*') as any);
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info(`No data to export from ${displayName}`);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, displayName);
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      XLSX.writeFile(wb, `${tableName}_backup_${timestamp}.xlsx`);
      toast.success(`${displayName} exported successfully`);
    } catch (error: any) {
      console.error(`Export error for ${tableName}:`, error);
      toast.error(`Failed to export ${displayName}: ${error.message}`);
    } finally {
      setExportingTable(null);
    }
  };

  const exportAllData = async () => {
    setIsExportingAll(true);
    const wb = XLSX.utils.book_new();
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

    const tables = [
      // Transactional data
      { name: 'leads', display: 'Leads' },
      { name: 'lead_transfers', display: 'Lead Transfers' },
      { name: 'call_logs', display: 'Call Logs' },
      { name: 'followup_logs', display: 'Followup Logs' },
      { name: 'orders', display: 'Orders' },
      { name: 'order_items', display: 'Order Items' },
      { name: 'order_status_history', display: 'Order History' },
      { name: 'order_comments', display: 'Order Comments' },
      { name: 'customers', display: 'Customers' },
      { name: 'customer_notes', display: 'Customer Notes' },
      // Logistics
      { name: 'logistics_orders', display: 'Logistics Orders' },
      { name: 'courier_updates', display: 'Courier Updates' },
      { name: 'cod_settlements', display: 'COD Settlements' },
      // Inventory
      { name: 'stock_movements', display: 'Stock Movements' },
      { name: 'product_inventory', display: 'Product Inventory' },
      { name: 'sales_records', display: 'Sales Records' },
      // Accounting
      { name: 'transactions', display: 'Transactions' },
      { name: 'party_payments', display: 'Party Payments' },
      { name: 'party_transactions', display: 'Party Transactions' },
      { name: 'accounting_transactions', display: 'Acct Transactions' },
      { name: 'accounting_invoices', display: 'Acct Invoices' },
      { name: 'accounting_bills', display: 'Acct Bills' },
      // HR
      { name: 'attendance_records', display: 'Attendance' },
      { name: 'leave_requests', display: 'Leave Requests' },
      { name: 'payroll_records', display: 'Payroll' },
      // Marketing
      { name: 'ads', display: 'Ads' },
      { name: 'ads_spend', display: 'Ads Spend' },
      { name: 'staff_targets', display: 'Staff Targets' },
      // Other
      { name: 'office_expenses', display: 'Office Expenses' },
      { name: 'notifications', display: 'Notifications' },
      { name: 'notices', display: 'Notices' },
      { name: 'chat_messages', display: 'Chat Messages' },
      // Master data
      { name: 'products', display: 'Products' },
      { name: 'branches', display: 'Branches' },
      { name: 'warehouses', display: 'Warehouses' },
      { name: 'parties', display: 'Parties' },
      { name: 'accounts', display: 'Accounts' },
      { name: 'employees', display: 'Employees' },
      { name: 'profiles', display: 'User Profiles' },
    ];

    try {
      let hasData = false;
      for (const table of tables) {
        const { data, error } = await (supabase.from(table.name as any).select('*') as any);
        if (error) {
          console.warn(`Could not export ${table.name}:`, error.message);
          continue;
        }
        if (data && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, table.display.substring(0, 31));
          hasData = true;
        }
      }

      if (!hasData) {
        toast.info('No data to export');
        return;
      }

      XLSX.writeFile(wb, `vakari_full_backup_${timestamp}.xlsx`);
      toast.success('Full data backup exported successfully');
      setBackupComplete(true);
    } catch (error: any) {
      console.error('Export all error:', error);
      toast.error(`Failed to export data: ${error.message}`);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleSystemReset = async () => {
    if (confirmText !== 'RESET') {
      toast.error('Please type RESET to confirm');
      return;
    }

    setIsResetting(true);
    setResetResults(null);
    
    try {
      // Call the database function to perform reset
      const { data, error } = await supabase.rpc('perform_system_reset');
      
      if (error) throw error;

      // Reset order number sequence
      await supabase.rpc('reset_order_number_sequence', { start_value: 1001 });

      setResetResults(data as ResetResult[]);
      toast.success('System reset completed! All transactional data has been cleared.');
      setDialogOpen(false);
      setConfirmText('');
      setBackupComplete(false);
    } catch (error: any) {
      console.error('System reset error:', error);
      toast.error(`Reset failed: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const exportButtons = [
    { table: 'leads', display: 'Leads' },
    { table: 'orders', display: 'Orders' },
    { table: 'order_items', display: 'Order Items' },
    { table: 'customers', display: 'Customers' },
    { table: 'stock_movements', display: 'Stock Movements' },
    { table: 'transactions', display: 'Transactions' },
    { table: 'attendance_records', display: 'Attendance' },
    { table: 'products', display: 'Products' },
    { table: 'branches', display: 'Branches' },
    { table: 'profiles', display: 'Users' },
  ];

  const tablesCleared = [
    'order_items', 'order_status_history', 'order_history', 'order_comments', 'order_events',
    'courier_updates', 'cod_settlements', 'logistics_orders', 'courier_stats',
    'call_logs', 'lead_transfers', 'followup_logs',
    'customer_activity_log', 'customer_notes',
    'orders', 'leads', 'customers',
    'accounting_transaction_lines', 'accounting_payments', 'accounting_invoice_items',
    'accounting_invoices', 'accounting_bills', 'accounting_transactions', 'accounting_cash_ledger',
    'transactions', 'party_payments', 'party_transactions',
    'stock_movements', 'sales_records',
    'attendance_records', 'leave_requests', 'leave_quota', 'payroll_records',
    'chat_messages', 'chat_room_members', 'chat_rooms', 'notifications', 'user_view_state',
    'ads', 'ads_spend', 'staff_targets',
    'office_expenses', 'notices',
    'audit_manual_entries', 'audit_entry_toggles', 'audit_snapshots', 'audit_logs'
  ];

  const tablesPreserved = [
    'products', 'categories', 'warehouses', 'branches', 'departments',
    'profiles', 'user_roles', 'employees', 'assets',
    'accounts', 'accounting_banks', 'accounting_expense_categories',
    'parties', 'accounting_suppliers', 'accounting_wholesalers',
    'couriers', 'company_info', 'lead_sources', 'leave_types', 'shifts',
    'transaction_categories', 'product_inventory (reset to opening)'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Data Tools</h1>
        <p className="text-muted-foreground">Administrative data management utilities</p>
      </div>

      {/* Order Copy Format Editor */}
      <OrderCopyFormatEditor />

      {/* Lead Sources Management */}
      <LeadSourcesManagement />

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Data Export / Backup
          </CardTitle>
          <CardDescription>
            Export your data to Excel files before making changes. <strong>Required before system reset.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Backup Button */}
          <div className={`p-4 border rounded-lg ${backupComplete ? 'bg-green-500/10 border-green-500/30' : 'bg-primary/5 border-primary/20'}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {backupComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  Full Data Backup
                </h4>
                <p className="text-sm text-muted-foreground">
                  Export all tables to a single Excel file with multiple sheets
                </p>
              </div>
              <Button 
                onClick={exportAllData} 
                disabled={isExportingAll}
                variant={backupComplete ? "outline" : "default"}
                className="gap-2"
              >
                {isExportingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {isExportingAll ? 'Exporting...' : backupComplete ? 'Download Again' : 'Export All Data'}
              </Button>
            </div>
          </div>

          {/* Individual Table Exports */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {exportButtons.map(({ table, display }) => (
              <Button
                key={table}
                variant="outline"
                size="sm"
                onClick={() => exportTableToExcel(table, display)}
                disabled={exportingTable === table}
                className="gap-1 text-xs"
              >
                {exportingTable === table ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {display}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reset Results */}
      {resetResults && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Reset Completed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
              {resetResults.map((result, idx) => (
                <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                  <span className="font-medium">{result.table_name}</span>
                  <span className="text-muted-foreground">{result.rows_deleted} rows</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Order numbers will start from #1001. All dashboards and reports are now reset to zero.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Danger Zone</AlertTitle>
        <AlertDescription>
          The tools below can permanently delete data. <strong>Export backup first!</strong>
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="w-5 h-5" />
            Full System Reset
          </CardTitle>
          <CardDescription>
            Clear all transactional data and start fresh. Master data (products, users, settings) will be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Tables to be cleared */}
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg text-sm">
              <p className="font-medium mb-2 text-destructive">Will be DELETED:</p>
              <div className="flex flex-wrap gap-1">
                {tablesCleared.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-destructive/10 text-destructive rounded text-xs">{t}</span>
                ))}
              </div>
            </div>

            {/* Tables preserved */}
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg text-sm">
              <p className="font-medium mb-2 text-green-600">Will be PRESERVED:</p>
              <div className="flex flex-wrap gap-1">
                {tablesPreserved.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" disabled={!backupComplete}>
                  <Trash2 className="w-4 h-4" />
                  {backupComplete ? 'Full System Reset' : 'Export Backup First'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    ⚠️ Confirm Full System Reset
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      This action cannot be undone. All transactional data will be permanently deleted.
                    </p>
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-green-700 text-sm">
                      ✓ Backup downloaded
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Type <span className="font-bold text-destructive">RESET</span> to confirm:
                      </label>
                      <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type RESET"
                        className="font-mono"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSystemReset}
                    disabled={confirmText !== 'RESET' || isResetting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isResetting ? 'Resetting...' : 'Confirm Reset'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
