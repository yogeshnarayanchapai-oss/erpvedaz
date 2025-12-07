import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Phone, Mail, Globe, FileText } from 'lucide-react';

interface CompanyInfo {
  company_name: string;
  registration_no?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  other_details?: string;
}

interface AuditCompanyInfoProps {
  companyInfo?: CompanyInfo | null;
}

export function AuditCompanyInfo({ companyInfo }: AuditCompanyInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Company Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-semibold text-lg">{companyInfo?.company_name || 'Not Set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Registration No.</p>
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
                <p className="text-sm text-muted-foreground">Other Details</p>
                <p className="font-medium whitespace-pre-wrap">{companyInfo.other_details}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
