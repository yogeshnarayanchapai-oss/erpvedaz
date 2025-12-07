import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, MapPin, Phone, Mail, Globe, FileText, Pencil, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CompanyInfo {
  id?: string;
  company_name: string;
  registration_no?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  other_details?: string;
}

interface AuditCompanyInfoEditableProps {
  companyInfo?: CompanyInfo | null;
  canEdit?: boolean;
}

export function AuditCompanyInfoEditable({ companyInfo, canEdit = false }: AuditCompanyInfoEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>({
    company_name: companyInfo?.company_name || '',
    registration_no: companyInfo?.registration_no || '',
    address: companyInfo?.address || '',
    phone: companyInfo?.phone || '',
    email: companyInfo?.email || '',
    website: companyInfo?.website || '',
    other_details: companyInfo?.other_details || '',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCompanyInfo = useMutation({
    mutationFn: async (data: CompanyInfo) => {
      if (companyInfo?.id) {
        const { error } = await supabase
          .from('company_info')
          .update({
            company_name: data.company_name,
            registration_no: data.registration_no,
            address: data.address,
            phone: data.phone,
            email: data.email,
            website: data.website,
            other_details: data.other_details,
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyInfo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_info')
          .insert({
            company_name: data.company_name,
            registration_no: data.registration_no,
            address: data.address,
            phone: data.phone,
            email: data.email,
            website: data.website,
            other_details: data.other_details,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-info'] });
      toast({ title: 'Company info updated successfully' });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error updating company info', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      toast({ title: 'Company name is required', variant: 'destructive' });
      return;
    }
    updateCompanyInfo.mutate(formData);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Profile
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-semibold text-lg">{companyInfo?.company_name || 'Not Set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PAN/VAT No.</p>
                <p className="font-medium">{companyInfo?.registration_no || 'Not Set'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{companyInfo?.address || 'Not Set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{companyInfo?.phone || 'Not Set'}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{companyInfo?.email || 'Not Set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <p className="font-medium">{companyInfo?.website || 'Not Set'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {companyInfo?.other_details && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Directors / Other Details</p>
                  <p className="font-medium whitespace-pre-wrap">{companyInfo.other_details}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Company Information</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>PAN/VAT Registration No.</Label>
              <Input
                value={formData.registration_no}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_no: e.target.value }))}
                placeholder="Enter PAN/VAT number"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Directors / Other Details</Label>
              <Textarea
                value={formData.other_details}
                onChange={(e) => setFormData(prev => ({ ...prev, other_details: e.target.value }))}
                placeholder="Enter directors names, additional company details..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateCompanyInfo.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {updateCompanyInfo.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
