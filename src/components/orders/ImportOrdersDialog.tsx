import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PAYMENT_OPTIONS = ['COD', 'PREPAID'];
const DELIVERY_OPTIONS = ['Inside Valley', 'Outside Valley'];
const STATUS_OPTIONS = ['CONFIRMED', 'PENDING', 'PACKED', 'DISPATCHED', 'DELIVERED'];

interface ImportOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalType: 'CALLING' | 'FOLLOWUP' | 'LOGISTICS';
}

interface ImportRow {
  date?: string;
  Date?: string;
  client?: string;
  Client?: string;
  CLIENT?: string;
  customer_name?: string;
  contact?: string;
  Contact?: string;
  CONTACT?: string;
  phone?: string;
  product?: string;
  Product?: string;
  PRODUCT?: string;
  qty?: string | number;
  Qty?: string | number;
  QTY?: string | number;
  quantity?: string | number;
  amount?: string | number;
  Amount?: string | number;
  AMOUNT?: string | number;
  payment?: string;
  Payment?: string;
  PAYMENT?: string;
  delivery?: string;
  Delivery?: string;
  DELIVERY?: string;
  branch?: string;
  Branch?: string;
  BRANCH?: string;
  status?: string;
  Status?: string;
  STATUS?: string;
  address?: string;
  Address?: string;
}

export function ImportOrdersDialog({ open, onOpenChange, portalType }: ImportOrdersDialogProps) {
  const { profile, user } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: branches = [] } = useBranches();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const getTemplateColumns = () => {
    return ['Date', 'Client', 'Contact', 'Product', 'Qty', 'Amount', 'Payment', 'Delivery', 'Branch', 'Status', 'Address'];
  };

  const downloadTemplate = () => {
    const columns = getTemplateColumns();
    
    // Create sample data row
    const sampleRow = [
      new Date().toISOString().split('T')[0],
      'John Doe',
      '9841234567',
      products.filter(p => p.is_active)[0]?.name || 'Product Name',
      1,
      900,
      'COD',
      'Outside Valley',
      branches[0]?.branch_name || 'Branch Name',
      'CONFIRMED',
      'Full address here'
    ];
    
    // Create products reference sheet
    const productsList = products.filter(p => p.is_active).map(p => ({ 
      'Product Name': p.name,
      'Price': (p as any).price || 'N/A'
    }));
    
    // Create branches reference sheet
    const branchesList = branches.filter(b => b.is_active).map(b => ({ 
      'Branch Name': b.branch_name,
      'District': b.district || '-'
    }));

    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const ws = XLSX.utils.aoa_to_sheet([columns, sampleRow]);
    ws['!cols'] = columns.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    
    // Products reference sheet
    const wsProducts = XLSX.utils.json_to_sheet(productsList);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');
    
    // Branches reference sheet
    const wsBranches = XLSX.utils.json_to_sheet(branchesList);
    XLSX.utils.book_append_sheet(wb, wsBranches, 'Branches');
    
    // Payment & Delivery reference
    const wsOptions = XLSX.utils.aoa_to_sheet([
      ['Payment Options', 'Delivery Options', 'Status Options'],
      ['COD', 'Inside Valley', 'CONFIRMED'],
      ['PREPAID', 'Outside Valley', 'PENDING'],
      ['', '', 'PACKED'],
      ['', '', 'DISPATCHED'],
      ['', '', 'DELIVERED'],
    ]);
    XLSX.utils.book_append_sheet(wb, wsOptions, 'Options Reference');
    
    XLSX.writeFile(wb, `orders_import_template_${portalType.toLowerCase()}.xlsx`);
    toast.success('Template downloaded');
  };

  const getValue = (row: ImportRow, keys: string[]): string | number | undefined => {
    for (const key of keys) {
      const value = row[key as keyof ImportRow];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setErrors([]);
    setImportComplete(false);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet, { raw: false });
        
        setParsedData(jsonData);
        
        // Validate data
        const validationErrors: string[] = [];
        jsonData.forEach((row, index) => {
          const client = getValue(row, ['client', 'Client', 'CLIENT', 'customer_name']);
          const contact = getValue(row, ['contact', 'Contact', 'CONTACT', 'phone']);
          const product = getValue(row, ['product', 'Product', 'PRODUCT']);
          const qty = getValue(row, ['qty', 'Qty', 'QTY', 'quantity']);
          const amount = getValue(row, ['amount', 'Amount', 'AMOUNT']);
          const payment = getValue(row, ['payment', 'Payment', 'PAYMENT']);
          const delivery = getValue(row, ['delivery', 'Delivery', 'DELIVERY']);
          
          if (!client) validationErrors.push(`Row ${index + 2}: Client name is required`);
          if (!contact) validationErrors.push(`Row ${index + 2}: Contact is required`);
          if (!product) validationErrors.push(`Row ${index + 2}: Product is required`);
          if (!qty || Number(qty) < 1) validationErrors.push(`Row ${index + 2}: Valid quantity is required`);
          if (!amount || Number(amount) <= 0) validationErrors.push(`Row ${index + 2}: Valid amount is required`);
          if (!payment) validationErrors.push(`Row ${index + 2}: Payment type is required`);
          if (!delivery) validationErrors.push(`Row ${index + 2}: Delivery location is required`);
          
          // Check if product exists
          if (product && !products.find(p => p.name.toLowerCase() === product.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Product "${product}" not found`);
          }
          
          // Check payment type
          if (payment && !PAYMENT_OPTIONS.find(p => p.toLowerCase() === payment.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Payment "${payment}" not valid. Use: ${PAYMENT_OPTIONS.join(', ')}`);
          }
          
          // Check delivery location
          const deliveryStr = delivery?.toString().toLowerCase().replace(/[_\s]/g, '');
          if (delivery && !['insidevalley', 'outsidevalley'].includes(deliveryStr || '')) {
            validationErrors.push(`Row ${index + 2}: Delivery "${delivery}" not valid. Use: ${DELIVERY_OPTIONS.join(', ')}`);
          }
        });
        
        setErrors(validationErrors);
      } catch (error) {
        toast.error('Failed to parse Excel file');
        setErrors(['Failed to parse the file. Please use the template format.']);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0 || errors.length > 0 || !user || !profile) {
      toast.error('Please fix errors before importing');
      return;
    }

    setIsImporting(true);
    try {
      // First, create leads for each order
      const leadsToInsert = parsedData.map(row => {
        const client = getValue(row, ['client', 'Client', 'CLIENT', 'customer_name']);
        const contact = getValue(row, ['contact', 'Contact', 'CONTACT', 'phone']);
        const productName = getValue(row, ['product', 'Product', 'PRODUCT']);
        const date = getValue(row, ['date', 'Date']) || new Date().toISOString().split('T')[0];
        
        const product = products.find(p => p.name.toLowerCase() === productName?.toString().toLowerCase());
        
        // Map LOGISTICS to FOLLOWUP for database compatibility
        const teamMapping: Record<string, 'LEADS' | 'CALLING' | 'FOLLOWUP'> = {
          'CALLING': 'CALLING',
          'FOLLOWUP': 'FOLLOWUP',
          'LOGISTICS': 'FOLLOWUP',
        };
        
        return {
          date: date.toString(),
          client_name: client?.toString().trim() || '',
          contact_number: contact?.toString().trim() || '',
          product_id: product?.id,
          source: portalType === 'CALLING' ? 'Calling' : 'Facebook Ads',
          created_by_user_id: profile.id,
          created_by_staff_id: profile.id,
          assigned_to_user_id: profile.id,
          status: 'CONFIRMED' as const,
          lead_bucket: 'FOLLOWUP' as const,
          current_team: teamMapping[portalType] || 'FOLLOWUP',
          pool_status: 'ASSIGNED' as const,
        };
      });

      const { data: createdLeads, error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select('id');
      
      if (leadsError) throw leadsError;

      // Now create orders linked to leads
      const ordersToInsert = parsedData.map((row, index) => {
        const productName = getValue(row, ['product', 'Product', 'PRODUCT']);
        const qty = Number(getValue(row, ['qty', 'Qty', 'QTY', 'quantity'])) || 1;
        const amount = Number(getValue(row, ['amount', 'Amount', 'AMOUNT'])) || 0;
        const payment = getValue(row, ['payment', 'Payment', 'PAYMENT'])?.toString().toUpperCase();
        const delivery = getValue(row, ['delivery', 'Delivery', 'DELIVERY'])?.toString().toLowerCase().replace(/[_\s]/g, '');
        const branch = getValue(row, ['branch', 'Branch', 'BRANCH'])?.toString();
        const statusRaw = getValue(row, ['status', 'Status', 'STATUS'])?.toString().toUpperCase() || 'CONFIRMED';
        const address = getValue(row, ['address', 'Address'])?.toString();
        const date = getValue(row, ['date', 'Date']) || new Date().toISOString();
        
        const product = products.find(p => p.name.toLowerCase() === productName?.toString().toLowerCase());
        const branchData = branches.find(b => b.branch_name.toLowerCase() === branch?.toLowerCase());
        const deliveryLocation = delivery === 'insidevalley' ? 'INSIDE_VALLEY' : 'OUTSIDE_VALLEY';
        const isCod = payment === 'COD';
        
        // Validate and cast order status to valid enum value
        const validStatuses = ['CONFIRMED', 'PENDING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REDIRECT', 'SENT_FOR_DELIVERY', 'LOCATION_CNR'] as const;
        type OrderStatus = typeof validStatuses[number];
        const orderStatus: OrderStatus = validStatuses.includes(statusRaw as OrderStatus) ? (statusRaw as OrderStatus) : 'CONFIRMED';

        return {
          lead_id: createdLeads?.[index]?.id,
          product_id: product?.id,
          quantity: qty,
          amount: amount,
          is_cod: isCod,
          payment_status: isCod ? 'PENDING' as const : 'PAID' as const,
          delivery_location: deliveryLocation as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY',
          destination_branch: branchData?.branch_name || branch || null,
          branch_id: branchData?.id || null,
          full_address: address || null,
          order_status: orderStatus,
          order_date: date.toString(),
          sales_person_id: profile.id,
          confirmed_by_user_id: profile.id,
          sent_to_logistics: deliveryLocation === 'OUTSIDE_VALLEY',
        };
      });

      const { error: ordersError } = await supabase.from('orders').insert(ordersToInsert);
      if (ordersError) throw ordersError;

      toast.success(`${ordersToInsert.length} orders imported successfully`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setImportComplete(true);
      
      setTimeout(() => {
        resetDialog();
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setImportComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getPortalLabel = () => {
    switch (portalType) {
      case 'CALLING': return 'Calling Portal';
      case 'FOLLOWUP': return 'Follow-Up Portal';
      case 'LOGISTICS': return 'Logistics Portal';
      default: return 'Portal';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetDialog();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Orders - {getPortalLabel()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Step 1: Download Template */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2">Step 1: Download Template</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download the Excel template with columns: Date, Client, Contact, Product, Qty, Amount, Payment, Delivery, Branch, Status, Address
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>
          
          {/* Step 2: Upload File */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Step 2: Upload Filled Template</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Upload your filled Excel file to import orders.
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>
          
          {/* Preview & Errors */}
          {file && (
            <div className="space-y-3">
              {importComplete ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {parsedData.length} orders imported successfully!
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">File:</span> {file.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Rows found:</span> {parsedData.length}
                    </p>
                  </div>
                  
                  {errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-1">Validation errors:</p>
                        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                          {errors.slice(0, 10).map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                          {errors.length > 10 && (
                            <li>... and {errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || parsedData.length === 0 || errors.length > 0 || isImporting || importComplete}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : `Import ${parsedData.length} Orders`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
