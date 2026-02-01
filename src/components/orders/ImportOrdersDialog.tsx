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

const STATUS_OPTIONS = ['NEW', 'FOLLOWUP', 'CONFIRMED', 'CANCELLED', 'NOT_INTERESTED'];
const DELIVERY_OPTIONS = ['Valley Delivery', 'Out Valley Delivery'];

interface ImportOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalType: 'CALLING' | 'FOLLOWUP' | 'LOGISTICS';
}

interface ImportRow {
  'S.No'?: string | number;
  'Date'?: string;
  'Customer'?: string;
  'Phone'?: string;
  'Product'?: string;
  'Branch'?: string;
  'Address'?: string;
  'Status'?: string;
  'Remark'?: string;
  'Delivery'?: string;
  // Alternate column names
  date?: string;
  customer?: string;
  phone?: string;
  product?: string;
  branch?: string;
  address?: string;
  status?: string;
  remark?: string;
  delivery?: string;
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
    return ['S.No', 'Date', 'Customer', 'Phone', 'Product', 'Branch', 'Address', 'Status', 'Remark', 'Delivery'];
  };

  const downloadTemplate = () => {
    const columns = getTemplateColumns();
    
    // Create sample data rows
    const sampleRows = [
      [
        1,
        new Date().toISOString().split('T')[0],
        'John Doe',
        '9841234567',
        products.filter(p => p.is_active)[0]?.name || 'Product Name',
        branches[0]?.branch_name || 'Branch Name',
        'Full address here',
        'NEW',
        'Sample remark',
        'Valley Delivery'
      ],
      [
        2,
        new Date().toISOString().split('T')[0],
        'Jane Smith',
        '9851234567',
        products.filter(p => p.is_active)[1]?.name || 'Product Name',
        branches[1]?.branch_name || 'Branch Name',
        'Another address',
        'CONFIRMED',
        '',
        'Out Valley Delivery'
      ]
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
    const ws = XLSX.utils.aoa_to_sheet([columns, ...sampleRows]);
    ws['!cols'] = columns.map((_, i) => ({ wch: i === 6 ? 25 : 16 })); // Wider column for Address
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    
    // Products reference sheet
    const wsProducts = XLSX.utils.json_to_sheet(productsList);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');
    
    // Branches reference sheet
    const wsBranches = XLSX.utils.json_to_sheet(branchesList);
    XLSX.utils.book_append_sheet(wb, wsBranches, 'Branches');
    
    // Status & Delivery reference
    const wsOptions = XLSX.utils.aoa_to_sheet([
      ['Status Options', 'Delivery Options'],
      ['NEW', 'Valley Delivery'],
      ['FOLLOWUP', 'Out Valley Delivery'],
      ['CONFIRMED', ''],
      ['CANCELLED', ''],
      ['NOT_INTERESTED', ''],
    ]);
    XLSX.utils.book_append_sheet(wb, wsOptions, 'Options Reference');
    
    XLSX.writeFile(wb, `leads_import_template_${portalType.toLowerCase()}.xlsx`);
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
          const customer = getValue(row, ['Customer', 'customer']);
          const phone = getValue(row, ['Phone', 'phone']);
          const product = getValue(row, ['Product', 'product']);
          const delivery = getValue(row, ['Delivery', 'delivery']);
          
          if (!customer) validationErrors.push(`Row ${index + 2}: Customer name is required`);
          if (!phone) validationErrors.push(`Row ${index + 2}: Phone is required`);
          if (!product) validationErrors.push(`Row ${index + 2}: Product is required`);
          if (!delivery) validationErrors.push(`Row ${index + 2}: Delivery type is required`);
          
          // Check if product exists
          if (product && !products.find(p => p.name.toLowerCase() === product.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Product "${product}" not found`);
          }
          
          // Check delivery type
          const deliveryStr = delivery?.toString().toLowerCase().trim();
          const validDelivery = deliveryStr === 'valley delivery' || deliveryStr === 'out valley delivery' || 
                               deliveryStr === 'inside valley' || deliveryStr === 'outside valley';
          if (delivery && !validDelivery) {
            validationErrors.push(`Row ${index + 2}: Delivery "${delivery}" not valid. Use: ${DELIVERY_OPTIONS.join(' or ')}`);
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
      // Create leads for each row
      const leadsToInsert = parsedData.map(row => {
        const customer = getValue(row, ['Customer', 'customer']);
        const phone = getValue(row, ['Phone', 'phone']);
        const productName = getValue(row, ['Product', 'product']);
        const branchName = getValue(row, ['Branch', 'branch']);
        const address = getValue(row, ['Address', 'address']);
        const statusRaw = getValue(row, ['Status', 'status'])?.toString().toUpperCase() || 'NEW';
        const remark = getValue(row, ['Remark', 'remark']);
        const deliveryRaw = getValue(row, ['Delivery', 'delivery'])?.toString().toLowerCase().trim() || '';
        const date = getValue(row, ['Date', 'date']) || new Date().toISOString().split('T')[0];
        
        const product = products.find(p => p.name.toLowerCase() === productName?.toString().toLowerCase());
        const branch = branches.find(b => b.branch_name.toLowerCase() === branchName?.toString().toLowerCase());
        
        // Determine delivery location
        const isInsideValley = deliveryRaw === 'valley delivery' || deliveryRaw === 'inside valley';
        const deliveryLocation = isInsideValley ? 'INSIDE_VALLEY' : 'OUTSIDE_VALLEY';
        
        // Validate and map status - using valid database enum values
        type ValidStatus = 'NEW' | 'FOLLOW_UP' | 'CONFIRMED' | 'CANCELLED';
        let mappedStatus: ValidStatus = 'NEW';
        const upperStatus = statusRaw.toUpperCase();
        if (upperStatus === 'CONFIRMED') mappedStatus = 'CONFIRMED';
        else if (upperStatus === 'FOLLOWUP' || upperStatus === 'FOLLOW_UP') mappedStatus = 'FOLLOW_UP';
        else if (upperStatus === 'CANCELLED' || upperStatus === 'NOT_INTERESTED') mappedStatus = 'CANCELLED';
        
        // Determine lead_bucket based on status - using valid enum values
        type ValidBucket = 'NEW' | 'FOLLOWUP' | 'CANCELLED';
        let leadBucket: ValidBucket = 'NEW';
        if (mappedStatus === 'FOLLOW_UP') leadBucket = 'FOLLOWUP';
        else if (mappedStatus === 'CANCELLED') leadBucket = 'CANCELLED';
        
        // Map portal type to current_team
        const teamMapping: Record<string, 'LEADS' | 'CALLING' | 'FOLLOWUP'> = {
          'CALLING': 'CALLING',
          'FOLLOWUP': 'FOLLOWUP',
          'LOGISTICS': 'FOLLOWUP',
        };
        
        return {
          date: date.toString(),
          client_name: customer?.toString().trim() || '',
          contact_number: phone?.toString().trim() || '',
          product_id: product?.id || null,
          branch_id: branch?.id || null,
          full_address: address?.toString().trim() || null,
          delivery_location: deliveryLocation as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY',
          source: 'Facebook Ads',
          remark: remark?.toString().trim() || null,
          status: mappedStatus,
          lead_bucket: leadBucket,
          current_team: teamMapping[portalType] || 'CALLING',
          pool_status: 'ASSIGNED' as const,
          created_by_user_id: profile.id,
          created_by_staff_id: profile.id,
          assigned_to_user_id: profile.id,
        };
      });

      const { error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert);
      
      if (leadsError) throw leadsError;

      toast.success(`${leadsToInsert.length} leads imported successfully`);
      
      // Invalidate ALL leads queries with any query key starting with 'leads'
      await queryClient.invalidateQueries({ 
        queryKey: ['leads'], 
        exact: false,
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({ queryKey: ['leads-transfer-summary'] });
      await queryClient.refetchQueries({ 
        queryKey: ['leads'], 
        exact: false,
        type: 'all' 
      });
      
      await queryClient.invalidateQueries({ queryKey: ['orders'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['orders'], type: 'all' });
      
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
            Import Leads - {getPortalLabel()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Step 1: Download Template */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2">Step 1: Download Template</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download the Excel template with columns: S.No, Date, Customer, Phone, Product, Branch, Address, Status, Remark, Delivery
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
              Upload your filled Excel file to import leads.
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
                    {parsedData.length} leads imported successfully!
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
            {isImporting ? 'Importing...' : `Import ${parsedData.length} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
