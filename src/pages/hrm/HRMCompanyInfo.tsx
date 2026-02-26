import { useState, useEffect, useRef } from 'react';
import { useCompanyInfo, useUpdateCompanyInfo, useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Building, CreditCard, Pencil, Trash2, Save, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { toast } from 'sonner';

export default function HRMCompanyInfo() {
  const { data: company, isLoading } = useCompanyInfo();
  const updateCompany = useUpdateCompanyInfo();
  const { data: bankAccounts = [] } = useBankAccounts();
  const createBank = useCreateBankAccount();
  const updateBank = useUpdateBankAccount();
  const deleteBank = useDeleteBankAccount();
  const storeId = useCurrentStoreId();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    registration_no: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    other_details: '',
  });

  const [bankOpen, setBankOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    branch: '',
    account_name: '',
    account_number: '',
    is_default: false,
  });

  useEffect(() => {
    if (company) {
      setCompanyForm({
        company_name: company.company_name || '',
        registration_no: company.registration_no || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        logo_url: company.logo_url || '',
        other_details: company.other_details || '',
      });
    }
  }, [company]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG, JPG, WEBP, SVG files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `company-logos/${storeId}/logo.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);
      
      // Add cache buster
      const logoUrl = `${publicUrl}?t=${Date.now()}`;
      setCompanyForm(prev => ({ ...prev, logo_url: logoUrl }));
      toast.success('Logo uploaded successfully');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setCompanyForm(prev => ({ ...prev, logo_url: '' }));
  };

  const handleCompanySave = async () => {
    await updateCompany.mutateAsync(companyForm);
  };

  const resetBankForm = () => {
    setBankForm({ bank_name: '', branch: '', account_name: '', account_number: '', is_default: false });
    setEditingBank(null);
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBank) {
      await updateBank.mutateAsync({ id: editingBank.id, ...bankForm });
    } else {
      await createBank.mutateAsync(bankForm);
    }
    setBankOpen(false);
    resetBankForm();
  };

  const openEditBank = (b: any) => {
    setEditingBank(b);
    setBankForm({
      bank_name: b.bank_name,
      branch: b.branch || '',
      account_name: b.account_name,
      account_number: b.account_number,
      is_default: b.is_default,
    });
    setBankOpen(true);
  };

  const handleDeleteBank = async (id: string) => {
    if (confirm('Delete this bank account?')) await deleteBank.mutateAsync(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Company & Bank Details</h1>
        <p className="text-muted-foreground">Manage company information and bank accounts</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-primary" />Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={companyForm.company_name} onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration No.</Label>
                    <Input value={companyForm.registration_no} onChange={(e) => setCompanyForm({ ...companyForm, registration_no: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Company Logo</Label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    {companyForm.logo_url ? (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        <img src={companyForm.logo_url} alt="Company Logo" className="h-14 w-14 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Logo uploaded</p>
                          <p className="text-xs text-muted-foreground">Click change to update</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change'}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={handleRemoveLogo} className="text-destructive">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="w-full h-20 border-dashed" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-5 h-5 mr-2" />
                        )}
                        {uploading ? 'Uploading...' : 'Upload Logo (PNG, JPG, WEBP, SVG)'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Other Details</Label>
                  <Textarea value={companyForm.other_details} onChange={(e) => setCompanyForm({ ...companyForm, other_details: e.target.value })} rows={2} />
                </div>
                <Button onClick={handleCompanySave} disabled={updateCompany.isPending}>
                  <Save className="w-4 h-4 mr-2" />Save Changes
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Bank Accounts</CardTitle>
            <Dialog open={bankOpen} onOpenChange={(open) => { setBankOpen(open); if (!open) resetBankForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingBank ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle></DialogHeader>
                <form onSubmit={handleBankSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Bank Name *</Label><Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Branch</Label><Input value={bankForm.branch} onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Account Name *</Label><Input value={bankForm.account_name} onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Account Number *</Label><Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} required /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={bankForm.is_default} onCheckedChange={(v) => setBankForm({ ...bankForm, is_default: v })} />
                    <Label>Default Account</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={createBank.isPending || updateBank.isPending}>{editingBank ? 'Update' : 'Create'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.bank_name}</TableCell>
                    <TableCell className="text-sm">{b.account_number}</TableCell>
                    <TableCell>{b.is_default && <Badge>Default</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditBank(b)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteBank(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {bankAccounts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No bank accounts</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
