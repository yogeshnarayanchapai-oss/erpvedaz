import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { FileText, User, Shield, Building2, Save, Loader2, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentUploadCard } from '@/components/documents/DocumentUploadCard';
import { MyBankAccountsCard } from '@/components/hrm/MyBankAccountsCard';
import {
  useMyEmployeeProfile,
  useEmployeeDocuments,
  useUpdateGuardianInfo,
  EmployeeDocument,
  EmployeeGuardianInfo,
} from '@/hooks/useEmployeeDocuments';

const RELATION_OPTIONS = [
  'Father',
  'Mother',
  'Spouse',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Guardian',
  'Other',
];

export default function MyHRDocuments() {
  const [activeTab, setActiveTab] = useState('documents');
  const { data: employee, isLoading: employeeLoading } = useMyEmployeeProfile();
  const { data: documents, isLoading: docsLoading } = useEmployeeDocuments(employee?.id);
  const updateGuardianMutation = useUpdateGuardianInfo();

  const { register, handleSubmit, setValue, watch, formState: { isDirty } } = useForm<EmployeeGuardianInfo>({
    values: {
      guardian_name: employee?.guardian_name || '',
      guardian_relation: employee?.guardian_relation || '',
      guardian_phone: employee?.guardian_phone || '',
      citizenship_number: employee?.citizenship_number || '',
      pan_number: employee?.pan_number || '',
    },
  });

  const onSubmitGuardian = async (data: EmployeeGuardianInfo) => {
    if (!employee) return;
    await updateGuardianMutation.mutateAsync({
      employeeId: employee.id,
      data,
    });
  };

  // Find existing documents by type
  const getDocByType = (type: string): EmployeeDocument | undefined => {
    return documents?.find(d => d.doc_type === type);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge className="bg-green-500/10 text-green-600">Verified</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500/10 text-red-600">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
    }
  };

  if (employeeLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Employee Profile Found</h3>
            <p className="text-muted-foreground">
              Your account is not linked to an employee record. Please contact HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Documents & KYC</h1>
        <p className="text-muted-foreground">
          Upload and manage your personal documents securely
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="emergency" className="gap-2">
            <Shield className="h-4 w-4" />
            Emergency Contact
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {/* Document Upload Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DocumentUploadCard
              title="Profile Photo"
              docType="PROFILE_PHOTO"
              employeeId={employee.id}
              existingDoc={getDocByType('PROFILE_PHOTO')}
              description="Your official profile photo"
            />
            <DocumentUploadCard
              title="Citizenship (Front)"
              docType="CITIZENSHIP_FRONT"
              employeeId={employee.id}
              existingDoc={getDocByType('CITIZENSHIP_FRONT')}
              description="Front side of citizenship"
            />
            <DocumentUploadCard
              title="Citizenship (Back)"
              docType="CITIZENSHIP_BACK"
              employeeId={employee.id}
              existingDoc={getDocByType('CITIZENSHIP_BACK')}
              description="Back side of citizenship"
            />
            <DocumentUploadCard
              title="PAN Card"
              docType="PAN_CARD"
              employeeId={employee.id}
              existingDoc={getDocByType('PAN_CARD')}
              description="Personal PAN card"
            />
          </div>

          {/* Company Document */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">Company Required Document</CardTitle>
              </div>
              <CardDescription>
                e.g. Signed appointment letter, contract, NDA, offer letter scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <DocumentUploadCard
                  title="Company Document"
                  docType="COMPANY_REQUIREMENT_DOC"
                  employeeId={employee.id}
                  existingDoc={getDocByType('COMPANY_REQUIREMENT_DOC')}
                />
              </div>
            </CardContent>
          </Card>

          {/* All Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                {documents?.length || 0} document(s) uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.doc_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{doc.title || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          {doc.verifier?.name || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank">
          <MyBankAccountsCard />
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact & KYC Information
              </CardTitle>
              <CardDescription>
                This information will be used in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitGuardian)} className="space-y-6 max-w-2xl">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guardian_name">Guardian Name *</Label>
                    <Input
                      id="guardian_name"
                      placeholder="घरबाट को जिम्मेवार व्यक्ति"
                      {...register('guardian_name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardian_relation">Relation</Label>
                    <Select
                      value={watch('guardian_relation') || ''}
                      onValueChange={(val) => setValue('guardian_relation', val, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_OPTIONS.map(rel => (
                          <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardian_phone">Guardian Phone *</Label>
                  <Input
                    id="guardian_phone"
                    type="tel"
                    placeholder="98XXXXXXXX"
                    {...register('guardian_phone')}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">KYC Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="citizenship_number">Citizenship Number</Label>
                      <Input
                        id="citizenship_number"
                        placeholder="Optional"
                        {...register('citizenship_number')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pan_number">PAN Number</Label>
                      <Input
                        id="pan_number"
                        placeholder="Optional"
                        {...register('pan_number')}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!isDirty || updateGuardianMutation.isPending}
                >
                  {updateGuardianMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
