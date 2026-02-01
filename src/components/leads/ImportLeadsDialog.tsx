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
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { notifyNewLeadsCreated } from '@/lib/notificationHelpers';
import { getNepalDate } from '@/hooks/useDashboardStats';

const SOURCE_OPTIONS = ['Facebook Ads', 'Shopify', 'Website', 'TikTok', 'Calling'];

const STATUS_OPTIONS = ['NEW', 'CONFIRMED', 'FOLLOW_UP', 'CANCELLED', 'CALL_NOT_RECEIVED'];

const DELIVERY_OPTIONS = ['INSIDE_VALLEY', 'OUTSIDE_VALLEY'];

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalType: 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP';
}

interface ImportRow {
  'S.No'?: string | number;
  'Date'?: string;
  'Customer'?: string;
  'Phone'?: string;
  'Alt Phone'?: string;
  'Product'?: string;
  'Branch'?: string;
  'Address'?: string;
  'Status'?: string;
  'Remark'?: string;
  'Delivery'?: string;
  // Legacy column names for backward compatibility
  date?: string;
  client_name?: string;
  customer_name?: string;
  contact_number?: string;
  phone?: string;
  alt_phone?: string;
  product?: string;
  source?: string;
  remark?: string;
  branch?: string;
  address?: string;
  status?: string;
  delivery?: string;
}

export function ImportLeadsDialog({ open, onOpenChange, portalType }: ImportLeadsDialogProps) {
  const { profile } = useAuth();
  const { currentStore } = useCurrentStore();
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
    return ['S.No', 'Date', 'Customer', 'Phone', 'Alt Phone', 'Product', 'Branch', 'Address', 'Status', 'Remark', 'Delivery'];
  };

  const downloadTemplate = () => {
    const columns = getTemplateColumns();
    
    // Create header row
    const headerRow = columns;
    
    // Create sample data row
    const sampleRow = [
      '1',
      getNepalDate(),
      'John Doe',
      '9841234567',
      '9851234567',
      products.filter(p => p.is_active)[0]?.name || 'Product Name',
      branches.filter(b => b.is_active)[0]?.branch_name || 'Kathmandu',
      'Sample Address, Ward 10',
      'NEW',
      'Sample remark',
      'INSIDE_VALLEY'
    ];
    
    // Create products reference sheet
    const productsList = products.filter(p => p.is_active).map(p => ({ 'Available Products': p.name }));
    
    // Create branches reference sheet
    const branchesList = branches.filter(b => b.is_active).map(b => ({ 'Available Branches': b.branch_name }));
    
    // Create status reference sheet
    const statusList = STATUS_OPTIONS.map(s => ({ 'Available Statuses': s }));
    
    // Create delivery reference sheet
    const deliveryList = DELIVERY_OPTIONS.map(d => ({ 'Delivery Options': d }));

    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
    ws['!cols'] = columns.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    
    // Products reference sheet
    const wsProducts = XLSX.utils.json_to_sheet(productsList);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products Reference');
    
    // Branches reference sheet
    const wsBranches = XLSX.utils.json_to_sheet(branchesList);
    XLSX.utils.book_append_sheet(wb, wsBranches, 'Branches Reference');
    
    // Status reference sheet
    const wsStatus = XLSX.utils.json_to_sheet(statusList);
    XLSX.utils.book_append_sheet(wb, wsStatus, 'Status Reference');
    
    // Delivery reference sheet
    const wsDelivery = XLSX.utils.json_to_sheet(deliveryList);
    XLSX.utils.book_append_sheet(wb, wsDelivery, 'Delivery Reference');
    
    XLSX.writeFile(wb, `leads_import_template_${portalType.toLowerCase()}.xlsx`);
    toast.success('Template downloaded');
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
          const name = row['Customer'] || row.client_name || row.customer_name;
          const phone = row['Phone'] || row.contact_number || row.phone;
          const productName = row['Product'] || row.product;
          const status = row['Status'] || row.status;
          const delivery = row['Delivery'] || row.delivery;
          const branchName = row['Branch'] || row.branch;
          
          if (!name) validationErrors.push(`Row ${index + 2}: Customer name is required`);
          if (!phone) validationErrors.push(`Row ${index + 2}: Phone is required`);
          if (!productName) validationErrors.push(`Row ${index + 2}: Product is required`);
          
          // Check if product exists
          if (productName && !products.find(p => p.name.toLowerCase() === productName.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Product "${productName}" not found`);
          }
          
          // Check if branch exists (optional)
          if (branchName && !branches.find(b => b.branch_name.toLowerCase() === branchName.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Branch "${branchName}" not found`);
          }
          
          // Check if status is valid (optional)
          if (status && !STATUS_OPTIONS.find(s => s.toLowerCase() === status.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Status "${status}" not valid. Use: ${STATUS_OPTIONS.join(', ')}`);
          }
          
          // Check if delivery is valid (optional)
          if (delivery && !DELIVERY_OPTIONS.find(d => d.toLowerCase() === delivery.toString().toLowerCase())) {
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
    if (parsedData.length === 0 || errors.length > 0) {
      toast.error('Please fix errors before importing');
      return;
    }

    if (!currentStore?.id) {
      toast.error('Store context not available. Please refresh and try again.');
      return;
    }

    setIsImporting(true);
    try {
      const leadsToInsert = parsedData.map(row => {
        const name = row['Customer'] || row.client_name || row.customer_name;
        const phone = row['Phone'] || row.contact_number || row.phone;
        const altPhone = row['Alt Phone'] || row.alt_phone;
        const productName = row['Product'] || row.product;
        const branchName = row['Branch'] || row.branch;
        const address = row['Address'] || row.address;
        const statusVal = row['Status'] || row.status;
        const remark = row['Remark'] || row.remark;
        const delivery = row['Delivery'] || row.delivery;
        const date = row['Date'] || row.date || getNepalDate();
        
        const product = products.find(p => p.name.toLowerCase() === productName?.toString().toLowerCase());
        const branch = branches.find(b => b.branch_name.toLowerCase() === branchName?.toString().toLowerCase());
        
        // Map status to valid enum value
        const statusUpper = statusVal?.toString().toUpperCase().replace(/ /g, '_');
        const validStatus = STATUS_OPTIONS.find(s => s === statusUpper) || 'NEW';
        
        // Map delivery to valid enum value
        const deliveryUpper = delivery?.toString().toUpperCase().replace(/ /g, '_');
        const validDelivery = DELIVERY_OPTIONS.find(d => d === deliveryUpper) || null;
        
        // Map lead_bucket based on status
        let leadBucket = 'NEW';
        if (validStatus === 'CONFIRMED') leadBucket = 'CONFIRMED';
        else if (validStatus === 'FOLLOW_UP') leadBucket = 'FOLLOWUP';
        else if (validStatus === 'CANCELLED' || validStatus === 'CALL_NOT_RECEIVED') leadBucket = 'REJECTED';
        
        // Base lead data
        const leadData: any = {
          date: date,
          client_name: name?.toString().trim(),
          contact_number: phone?.toString().trim(),
          alt_phone: altPhone?.toString().trim() || null,
          product_id: product?.id,
          branch_id: branch?.id || null,
          destination_branch: branchName?.toString().trim() || null,
          full_address: address?.toString().trim() || null,
          od_vd: validDelivery,
          remark: remark?.toString().trim() || null,
          created_by_user_id: profile?.id,
          created_by_staff_id: profile?.id,
          status: validStatus,
          lead_bucket: leadBucket,
          source: 'Facebook Ads', // Default source
          store_id: currentStore.id,
          entry_type: 'IMPORT',
        };
        
        // Portal-specific settings
        if (portalType === 'CALLING') {
          leadData.source = 'Calling';
          leadData.assigned_to_user_id = profile?.id;
          leadData.current_team = 'CALLING';
          leadData.pool_status = 'ASSIGNED';
        } else if (portalType === 'FOLLOWUP') {
          leadData.assigned_to_user_id = profile?.id;
          leadData.current_team = 'FOLLOWUP';
          leadData.pool_status = 'ASSIGNED';
        } else {
          leadData.current_team = 'LEADS';
          leadData.pool_status = 'IN_POOL';
        }
        
        return leadData;
      });

      const { error } = await supabase.from('leads').insert(leadsToInsert);
      if (error) throw error;

      // Send notification to Admin about imported leads
      try {
        await notifyNewLeadsCreated({
          count: leadsToInsert.length,
          createdByName: profile?.name || 'Staff',
          createdById: profile?.id || '',
          portal: portalType,
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      toast.success(`${leadsToInsert.length} leads imported successfully`);
      
      // Invalidate and immediately refetch to ensure creator sees their new leads
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ['leads'], type: 'active' });
      
      setImportComplete(true);
      
      // Reset after short delay
      setTimeout(() => {
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setImportComplete(false);
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

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetDialog();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Leads from Excel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Step 1: Download Template */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2">Step 1: Download Template</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download the Excel template with correct columns (S.No, Date, Customer, Phone, Alt Phone, Product, Branch, Address, Status, Remark, Delivery).
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
