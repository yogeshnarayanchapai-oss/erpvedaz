import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SOURCE_OPTIONS = ['Facebook Ads', 'Shopify', 'Website', 'TikTok', 'Calling'];

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalType: 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP';
}

interface ImportRow {
  date?: string;
  client_name?: string;
  customer_name?: string;
  contact_number?: string;
  phone?: string;
  alt_phone?: string;
  product?: string;
  source?: string;
  remark?: string;
}

export function ImportLeadsDialog({ open, onOpenChange, portalType }: ImportLeadsDialogProps) {
  const { profile } = useAuth();
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const getTemplateColumns = () => {
    return ['Date', 'Customer Name', 'Phone', 'Alt Phone', 'Product', 'Source', 'Remark'];
  };

  const downloadTemplate = () => {
    const columns = getTemplateColumns();
    
    // Create header row
    const headerRow = columns;
    
    // Create sample data row
    const sampleRow = [
      new Date().toISOString().split('T')[0],
      'John Doe',
      '9841234567',
      '9851234567',
      products.filter(p => p.is_active)[0]?.name || 'Product Name',
      'Facebook Ads',
      'Sample remark'
    ];
    
    // Create products reference sheet
    const productsList = products.filter(p => p.is_active).map(p => ({ 'Available Products': p.name }));
    
    // Create sources reference sheet
    const sourcesList = SOURCE_OPTIONS.map(s => ({ 'Available Sources': s }));

    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
    ws['!cols'] = columns.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    
    // Products reference sheet
    const wsProducts = XLSX.utils.json_to_sheet(productsList);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products Reference');
    
    // Sources reference sheet
    const wsSources = XLSX.utils.json_to_sheet(sourcesList);
    XLSX.utils.book_append_sheet(wb, wsSources, 'Sources Reference');
    
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
          const name = row.client_name || row.customer_name || row['Customer Name'];
          const phone = row.contact_number || row.phone || row['Phone'];
          const product = row.product || row['Product'];
          const source = row.source || row['Source'];
          
          if (!name) validationErrors.push(`Row ${index + 2}: Customer name is required`);
          if (!phone) validationErrors.push(`Row ${index + 2}: Phone is required`);
          if (!product) validationErrors.push(`Row ${index + 2}: Product is required`);
          if (!source) validationErrors.push(`Row ${index + 2}: Source is required`);
          
          // Check if product exists
          if (product && !products.find(p => p.name.toLowerCase() === product.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Product "${product}" not found`);
          }
          
          // Check if source exists in hardcoded options
          if (source && !SOURCE_OPTIONS.find(s => s.toLowerCase() === source.toString().toLowerCase())) {
            validationErrors.push(`Row ${index + 2}: Source "${source}" not valid. Use: ${SOURCE_OPTIONS.join(', ')}`);
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

    setIsImporting(true);
    try {
      const leadsToInsert = parsedData.map(row => {
        const name = row.client_name || row.customer_name || row['Customer Name'];
        const phone = row.contact_number || row.phone || row['Phone'];
        const altPhone = row.alt_phone || row['Alt Phone'];
        const productName = row.product || row['Product'];
        const sourceName = row.source || row['Source'];
        const remark = row.remark || row['Remark'];
        const date = row.date || row['Date'] || new Date().toISOString().split('T')[0];
        
        const product = products.find(p => p.name.toLowerCase() === productName?.toString().toLowerCase());
        const sourceValue = SOURCE_OPTIONS.find(s => s.toLowerCase() === sourceName?.toString().toLowerCase()) || 'Facebook Ads';
        
        // Base lead data
        const leadData: any = {
          date: date,
          client_name: name?.toString().trim(),
          contact_number: phone?.toString().trim(),
          alt_phone: altPhone?.toString().trim() || null,
          product_id: product?.id,
          source: sourceValue,
          remark: remark?.toString().trim() || null,
          created_by_user_id: profile?.id,
          created_by_staff_id: profile?.id,
          status: 'NEW',
          lead_bucket: 'NEW',
        };
        
        // Portal-specific settings
        if (portalType === 'CALLING') {
          leadData.source = 'Direct Call';
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

      toast.success(`${leadsToInsert.length} leads imported successfully`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
              Download the Excel template with correct columns and fill your data.
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
