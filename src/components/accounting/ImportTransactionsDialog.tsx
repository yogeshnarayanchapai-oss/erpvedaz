import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { useParties } from '@/hooks/useParties';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportTransactionsDialogProps {
  type: 'income' | 'expense';
  trigger?: React.ReactNode;
}

interface ImportRow {
  date: string;
  amount: number;
  account: string;
  category: string;
  party?: string;
  reference?: string;
  note?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  row: ImportRow;
  rowIndex: number;
}

export function ImportTransactionsDialog({ type, trigger }: ImportTransactionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTransaction = useCreateTransaction();
  const { data: accounts = [] } = useActiveAccounts();
  const { data: categories = [] } = useTransactionCategories();
  const { data: parties = [] } = useParties();

  const filteredCategories = categories.filter(c => c.nature === type);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Date (YYYY-MM-DD)': format(new Date(), 'yyyy-MM-dd'),
        'Amount': 1000,
        'Account Name': accounts[0]?.name || 'Cash',
        'Category Name': filteredCategories[0]?.name || (type === 'income' ? 'Sales' : 'Office Expense'),
        'Party Name (Optional)': '',
        'Reference (Optional)': '',
        'Note (Optional)': 'Sample transaction'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'income' ? 'Deposits' : 'Expenses');

    // Add a reference sheet with valid options
    const accountsList = accounts.map(a => ({ 'Account Names': a.name }));
    const categoriesList = filteredCategories.map(c => ({ 'Category Names': c.name }));
    const partiesList = parties.map(p => ({ 'Party Names': p.name }));

    if (accountsList.length > 0) {
      const accountsSheet = XLSX.utils.json_to_sheet(accountsList);
      XLSX.utils.book_append_sheet(wb, accountsSheet, 'Valid Accounts');
    }

    if (categoriesList.length > 0) {
      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesList);
      XLSX.utils.book_append_sheet(wb, categoriesSheet, 'Valid Categories');
    }

    if (partiesList.length > 0) {
      const partiesSheet = XLSX.utils.json_to_sheet(partiesList);
      XLSX.utils.book_append_sheet(wb, partiesSheet, 'Valid Parties');
    }

    XLSX.writeFile(wb, `${type === 'income' ? 'deposit' : 'expense'}_import_template.xlsx`);
    toast.success('Template downloaded successfully');
  };

  // Helper function to parse various date formats including Excel serial dates
  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    // If it's a number, treat as Excel serial date
    if (typeof dateValue === 'number') {
      // Excel serial date: days since 1899-12-30
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return format(date, 'yyyy-MM-dd');
      }
      return null;
    }
    
    const dateStr = String(dateValue).trim();
    
    // Try various date formats
    const formats = [
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];
    
    // Try YYYY-MM-DD first
    let match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return format(date, 'yyyy-MM-dd');
      }
    }
    
    // Try DD/MM/YYYY
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return format(date, 'yyyy-MM-dd');
      }
    }
    
    // Try DD-MM-YYYY
    match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return format(date, 'yyyy-MM-dd');
      }
    }
    
    // Fallback: try native Date parsing
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      return format(fallbackDate, 'yyyy-MM-dd');
    }
    
    return null;
  };

  const validateRow = (row: any, index: number): ValidationResult => {
    const errors: string[] = [];
    
    // Extract values
    const rawDate = row['Date (YYYY-MM-DD)'] || row['date'] || row['Date'];
    const parsedDate = parseDate(rawDate);
    const amount = parseFloat(row['Amount'] || row['amount'] || 0);
    const accountName = (row['Account Name'] || row['account'] || row['Account'] || '').toString().trim();
    const categoryName = (row['Category Name'] || row['category'] || row['Category'] || '').toString().trim();
    const partyName = (row['Party Name (Optional)'] || row['party'] || row['Party'] || '').toString().trim();
    const reference = (row['Reference (Optional)'] || row['reference'] || row['Reference'] || '').toString().trim();
    const note = (row['Note (Optional)'] || row['note'] || row['Note'] || '').toString().trim();

    // Validate date
    if (!rawDate) {
      errors.push('Date is required');
    } else if (!parsedDate) {
      errors.push(`Invalid date format "${rawDate}". Use YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY`);
    }

    // Validate amount
    if (!amount || amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Validate account
    const matchedAccount = accounts.find(a => 
      a.name.toLowerCase() === accountName.toLowerCase()
    );
    if (!accountName) {
      errors.push('Account is required');
    } else if (!matchedAccount) {
      errors.push(`Account "${accountName}" not found`);
    }

    // Validate category
    const matchedCategory = filteredCategories.find(c => 
      c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!categoryName) {
      errors.push('Category is required');
    } else if (!matchedCategory) {
      errors.push(`Category "${categoryName}" not found`);
    }

    return {
      valid: errors.length === 0,
      errors,
      row: {
        date: parsedDate || rawDate,
        amount,
        account: accountName,
        category: categoryName,
        party: partyName,
        reference,
        note
      },
      rowIndex: index + 2 // Excel rows start at 1, plus header
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('No data found in the Excel file');
        return;
      }

      // Validate all rows
      const results = jsonData.map((row, index) => validateRow(row, index));
      setValidationResults(results);

      const validCount = results.filter(r => r.valid).length;
      const invalidCount = results.filter(r => !r.valid).length;

      if (invalidCount > 0) {
        toast.warning(`${validCount} valid rows, ${invalidCount} rows with errors`);
      } else {
        toast.success(`${validCount} rows ready to import`);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read Excel file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validRows = validationResults.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const result of validRows) {
        const { row } = result;

        const matchedAccount = accounts.find(a => 
          a.name.toLowerCase() === row.account.toLowerCase()
        );
        const matchedCategory = filteredCategories.find(c => 
          c.name.toLowerCase() === row.category.toLowerCase()
        );
        const matchedParty = row.party 
          ? parties.find(p => p.name.toLowerCase() === row.party!.toLowerCase())
          : null;

        await createTransaction.mutateAsync({
          date: row.date,
          type,
          amount: row.amount,
          currency: 'NPR',
          account_id: matchedAccount?.id || null,
          category_id: matchedCategory?.id || null,
          party_id: matchedParty?.id || null,
          reference_no: row.reference || null,
          note: row.note || null,
          description: row.note || (type === 'income' ? 'Imported Deposit' : 'Imported Expense'),
          is_cleared: false,
          created_by: null,
          from_account_id: null,
          to_account_id: null,
          order_id: null,
        });

        successCount++;
      }

      setImportedCount(successCount);
      toast.success(`Successfully imported ${successCount} ${type === 'income' ? 'deposits' : 'expenses'}`);
      setValidationResults([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed after ${successCount} rows`);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidResults = validationResults.filter(r => !r.valid);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import {type === 'income' ? 'Deposits' : 'Expenses'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Step 1: Download Template</p>
              <p className="text-sm text-muted-foreground">
                Get the Excel template with valid accounts, categories, and parties
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Upload File */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Step 2: Upload Filled Template</p>
              <p className="text-sm text-muted-foreground">
                Upload your Excel file with transaction data
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="transaction-import-file"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel
              </Button>
            </div>
          </div>

          {/* Validation Results */}
          {validationResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{validCount} valid rows</span>
                </div>
                {invalidResults.length > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{invalidResults.length} rows with errors</span>
                  </div>
                )}
              </div>

              {invalidResults.length > 0 && (
                <ScrollArea className="h-40 border rounded-lg p-3">
                  <div className="space-y-2">
                    {invalidResults.map((result, index) => (
                      <Alert key={index} variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Row {result.rowIndex}:</strong> {result.errors.join(', ')}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Import Button */}
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
                className="w-full"
              >
                {isImporting ? 'Importing...' : `Import ${validCount} ${type === 'income' ? 'Deposits' : 'Expenses'}`}
              </Button>
            </div>
          )}

          {/* Success Message */}
          {importedCount > 0 && validationResults.length === 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Successfully imported {importedCount} transactions. You can close this dialog or import more.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
