import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, Branch } from '@/hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Plus, Edit2, Trash2, Search, Upload, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminBranches() {
  const queryClient = useQueryClient();
  const { data: branches = [], isLoading, refetch } = useBranches({ includeInactive: false });
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Branch | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  
  const [formData, setFormData] = useState({
    branch_name: '',
    code: '',
    arrival_time: '',
    contact_name: '',
    contact_phone: '',
    district: '',
    province: '',
    base_charge: '',
    area_covered: '',
    is_active: true,
  });

  const filteredBranches = useMemo(() => {
    if (!search) return branches;
    const term = search.toLowerCase();
    return branches.filter(b =>
      b.branch_name.toLowerCase().includes(term) ||
      b.district?.toLowerCase().includes(term) ||
      b.province?.toLowerCase().includes(term) ||
      b.area_covered?.toLowerCase().includes(term)
    );
  }, [branches, search]);

  const resetForm = () => {
    setFormData({
      branch_name: '',
      code: '',
      arrival_time: '',
      contact_name: '',
      contact_phone: '',
      district: '',
      province: '',
      base_charge: '',
      area_covered: '',
      is_active: true,
    });
    setEditingBranch(null);
  };

  const openCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      code: branch.code || '',
      arrival_time: branch.arrival_time || '',
      contact_name: branch.contact_name || '',
      contact_phone: branch.contact_phone || '',
      district: branch.district || '',
      province: branch.province || '',
      base_charge: branch.base_charge?.toString() || '',
      area_covered: branch.area_covered || '',
      is_active: branch.is_active,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      branch_name: formData.branch_name,
      code: formData.code || undefined,
      arrival_time: formData.arrival_time || undefined,
      contact_name: formData.contact_name || undefined,
      contact_phone: formData.contact_phone || undefined,
      district: formData.district || undefined,
      province: formData.province || undefined,
      base_charge: formData.base_charge ? parseFloat(formData.base_charge) : undefined,
      area_covered: formData.area_covered || undefined,
      is_active: formData.is_active,
    };

    if (editingBranch) {
      await updateBranch.mutateAsync({ id: editingBranch.id, ...data });
    } else {
      await createBranch.mutateAsync(data);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteBranch.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: false })
        .in('id', selectedIds);
      
      if (error) throw error;
      
      toast.success(`${selectedIds.length} branches deactivated successfully`);
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
    } catch (error: any) {
      toast.error(`Failed to deactivate branches: ${error.message}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBranches.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBranches.map(b => b.id));
    }
  };

  const parseGBLFormat = (rows: any[]): any[] => {
    const branchesToInsert: any[] = [];
    
    for (const row of rows) {
      const keys = Object.keys(row);
      
      // Try to find columns by partial match
      const findCol = (patterns: string[]) => {
        for (const p of patterns) {
          const key = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '').includes(p.toLowerCase().replace(/[^a-z]/g, '')));
          if (key && row[key] != null) return String(row[key]).trim();
        }
        return '';
      };

      const branchArrival = findCol(['Branch Name', 'branchname', 'branch_name']);
      const contacts = findCol(['Contacts', 'contact']);
      const district = findCol(['District']);
      const province = findCol(['Province']);
      const charge = findCol(['Delivery Charge', 'base_charge', 'charge']);
      const area = findCol(['Area Covered', 'area_covered', 'area']);
      
      if (!branchArrival) continue;

      // Parse branch name and arrival time from combined field
      let branchName = branchArrival;
      let arrivalTime = '';
      const arrivalMatch = branchArrival.match(/(\d+-?\d*\s*DAYS?|\d+\s*DAY)/i);
      if (arrivalMatch) {
        arrivalTime = arrivalMatch[0].toUpperCase();
        branchName = branchArrival.replace(arrivalMatch[0], '').trim();
      }

      // Parse contact name and phone from combined field
      let contactName = '';
      let contactPhone = '';
      if (contacts) {
        const phoneMatch = contacts.match(/(\d{10})/);
        if (phoneMatch) {
          contactPhone = phoneMatch[1];
          // Get name before the first phone number
          const namepart = contacts.substring(0, contacts.indexOf(phoneMatch[1])).trim();
          contactName = namepart.replace(/[,\s]+$/, '');
        } else {
          contactName = contacts;
        }
      }

      if (!branchName) continue;

      branchesToInsert.push({
        branch_name: branchName.toUpperCase(),
        arrival_time: arrivalTime || null,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        district: district ? district.toUpperCase() : null,
        province: province || null,
        base_charge: charge ? parseFloat(charge) || null : null,
        area_covered: area || null,
        is_active: true,
      });
    }
    return branchesToInsert;
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    try {
      const isXlsx = importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls');
      let branchesToInsert: any[] = [];
      
      if (isXlsx) {
        const buffer = await importFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Find header row (look for row containing "Branch Name" or "District")
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        let headerRow = 0;
        for (let r = range.s.r; r <= Math.min(range.e.r, 5); r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            if (cell && String(cell.v || '').toLowerCase().includes('branch name')) {
              headerRow = r;
              break;
            }
          }
        }
        
        const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRow, defval: '' });
        branchesToInsert = parseGBLFormat(rows);
      } else {
        // CSV parsing (existing logic)
        const text = await importFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/ /g, '_'));
        
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
          }
          values.push(current.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          rows.push(row);
        }
        branchesToInsert = parseGBLFormat(rows);
      }

      if (branchesToInsert.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < branchesToInsert.length; i += 100) {
          const batch = branchesToInsert.slice(i, i + 100);
          const { error } = await supabase.from('branches').insert(batch);
          if (error) throw error;
        }
        
        toast.success(`${branchesToInsert.length} branches imported successfully`);
        queryClient.invalidateQueries({ queryKey: ['branches'] });
        setIsImportOpen(false);
        setImportFile(null);
      } else {
        toast.error('No valid branches found in file');
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['branch_name', 'code', 'arrival_time', 'contact_name', 'contact_phone', 'district', 'province', 'base_charge', 'area_covered', 'is_active'];
    const rows = branches.map(b => [
      b.branch_name,
      b.code || '',
      b.arrival_time || '',
      b.contact_name || '',
      b.contact_phone || '',
      b.district || '',
      b.province || '',
      b.base_charge?.toString() || '',
      b.area_covered || '',
      b.is_active ? 'true' : 'false',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branches_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Branches exported successfully');
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Branch Name/Arrival time', 'Contacts', 'District', 'Province', 'Delivery Charge', 'Area Covered'];
    const exampleData = [
      ['ATTARIYA1-2 DAYS', 'Gyanendra Rawal 9802266863', 'KAILALI', 'Sudurpaschim Province', 220, 'GETA, ATTARIYA CHOWK, LALPUR'],
      ['TANDI1-2 DAYS', 'Kanchan Poudel 9802266728', 'CHITWAN', 'Bagmati Province', 200, 'TIKAULI, GANESH CHOWK'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 22 }, { wch: 15 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Branches');
    XLSX.writeFile(wb, 'branches_import_template.xlsx');
    toast.success('Template downloaded');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-muted-foreground">Manage delivery branch master data</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, district, province, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Branch List ({filteredBranches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header w-12">
                    <Checkbox
                      checked={filteredBranches.length > 0 && selectedIds.length === filteredBranches.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="table-header">Branch Name</TableHead>
                  <TableHead className="table-header">Arrival</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Phone</TableHead>
                  <TableHead className="table-header">District</TableHead>
                  <TableHead className="table-header">Province</TableHead>
                  <TableHead className="table-header text-right">Base Charge</TableHead>
                  <TableHead className="table-header max-w-[200px]">Area Covered</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((branch) => (
                  <TableRow key={branch.id} className={!branch.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(branch.id)}
                        onCheckedChange={() => toggleSelect(branch.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{branch.branch_name}</TableCell>
                    <TableCell>{branch.arrival_time || '-'}</TableCell>
                    <TableCell>{branch.contact_name || '-'}</TableCell>
                    <TableCell>{branch.contact_phone || '-'}</TableCell>
                    <TableCell>{branch.district || '-'}</TableCell>
                    <TableCell>{branch.province || '-'}</TableCell>
                    <TableCell className="text-right">
                      {branch.base_charge !== null ? `₹${branch.base_charge}` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={branch.area_covered || ''}>
                      {branch.area_covered || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={branch.is_active ? 'default' : 'secondary'}
                        className={branch.is_active ? 'bg-success text-success-foreground' : ''}
                      >
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(branch)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteConfirm(branch)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBranches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No branches found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Branches from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">CSV should have columns:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                branch_name, code, arrival_time, contact_name, contact_phone, district, province, base_charge, area_covered
              </code>
              <p className="mt-2 text-xs">Only <strong>branch_name</strong> is required. Other fields are optional.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Template CSV
            </Button>
            <div className="space-y-2">
              <Label>Select CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleImport} className="w-full" disabled={importing || !importFile}>
              {importing ? 'Importing...' : 'Import Branches'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name *</Label>
              <Input
                id="branch_name"
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                required
                placeholder="e.g., 4 NO JEETPUR"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrival_time">Arrival Time</Label>
                <Input
                  id="arrival_time"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                  placeholder="e.g., 1-2 DAYS"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="e.g., GBL STAFF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="e.g., 9802266733"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="e.g., KAPILBASTU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="e.g., Lumbini Province"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_charge">Base Charge</Label>
              <Input
                id="base_charge"
                type="number"
                step="0.01"
                value={formData.base_charge}
                onChange={(e) => setFormData({ ...formData, base_charge: e.target.value })}
                placeholder="e.g., 225"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_covered">Area Covered</Label>
              <Textarea
                id="area_covered"
                value={formData.area_covered}
                onChange={(e) => setFormData({ ...formData, area_covered: e.target.value })}
                placeholder="List of areas covered by this branch..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="is_active">Active Status</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createBranch.isPending || updateBranch.isPending}
            >
              {editingBranch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.branch_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Branches</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected branches? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
