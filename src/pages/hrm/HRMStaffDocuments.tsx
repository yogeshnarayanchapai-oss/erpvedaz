import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Filter, Eye, CheckCircle, XCircle, Trash2, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadCard } from '@/components/documents/DocumentUploadCard';
import {
  useAllEmployeeDocuments,
  useVerifyDocument,
  useDeleteDocument,
  useMyEmployeeProfile,
  useEmployeeDocuments,
  EmployeeDocument,
  EmployeeDocStatus,
  EmployeeDocType,
  getSignedDocumentUrl,
} from '@/hooks/useEmployeeDocuments';
import { useAuth } from '@/contexts/AuthContext';

const DOC_TYPE_OPTIONS: { value: EmployeeDocType; label: string }[] = [
  { value: 'PROFILE_PHOTO', label: 'Profile Photo' },
  { value: 'CITIZENSHIP_FRONT', label: 'Citizenship (Front)' },
  { value: 'CITIZENSHIP_BACK', label: 'Citizenship (Back)' },
  { value: 'PAN_CARD', label: 'PAN Card' },
  { value: 'COMPANY_REQUIREMENT_DOC', label: 'Company Document' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: EmployeeDocStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function HRMStaffDocuments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeDocStatus | 'ALL'>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<EmployeeDocType | 'ALL'>('ALL');
  
  const [viewDoc, setViewDoc] = useState<EmployeeDocument | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  
  const [verifyDoc, setVerifyDoc] = useState<EmployeeDocument | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<EmployeeDocStatus>('VERIFIED');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  
  const [deleteDoc, setDeleteDoc] = useState<EmployeeDocument | null>(null);

  const { data: documents, isLoading } = useAllEmployeeDocuments({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    docType: docTypeFilter !== 'ALL' ? docTypeFilter : undefined,
  });
  
  // My own profile and documents for self-upload
  const { data: myEmployee, isLoading: loadingMyEmployee } = useMyEmployeeProfile();
  const { data: myDocuments, isLoading: loadingMyDocs } = useEmployeeDocuments(myEmployee?.id);
  
  const verifyMutation = useVerifyDocument();
  const deleteMutation = useDeleteDocument();
  
  // Get existing doc by type for my documents
  const getMyDocByType = (type: string): EmployeeDocument | undefined => {
    return myDocuments?.find(d => d.doc_type === type);
  };

  const handleView = async (doc: EmployeeDocument) => {
    setViewDoc(doc);
    setLoadingUrl(true);
    try {
      const url = await getSignedDocumentUrl(doc.file_url);
      setSignedUrl(url);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyDoc || !user) return;
    await verifyMutation.mutateAsync({
      documentId: verifyDoc.id,
      status: verifyStatus,
      remarks: verifyRemarks,
      verifierId: user.id,
    });
    setVerifyDoc(null);
    setVerifyRemarks('');
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    await deleteMutation.mutateAsync({
      documentId: deleteDoc.id,
      fileUrl: deleteDoc.file_url,
    });
    setDeleteDoc(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
    }
  };

  const isImage = (url: string) => url?.match(/\.(jpg|jpeg|png|webp)$/i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Documents</h1>
          <p className="text-muted-foreground">
            Review and verify employee documents
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            All Documents
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            <User className="h-4 w-4" />
            My Documents
          </TabsTrigger>
        </TabsList>

        {/* My Documents Tab */}
        <TabsContent value="my" className="space-y-6">
          {loadingMyEmployee ? (
            <Skeleton className="h-48" />
          ) : !myEmployee ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Employee Profile</h3>
                <p className="text-muted-foreground">Your account is not linked to an employee record.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <DocumentUploadCard
                title="Profile Photo"
                docType="PROFILE_PHOTO"
                employeeId={myEmployee.id}
                existingDoc={getMyDocByType('PROFILE_PHOTO')}
                description="Your official profile photo"
              />
              <DocumentUploadCard
                title="Citizenship (Front)"
                docType="CITIZENSHIP_FRONT"
                employeeId={myEmployee.id}
                existingDoc={getMyDocByType('CITIZENSHIP_FRONT')}
                description="Front side of citizenship"
              />
              <DocumentUploadCard
                title="Citizenship (Back)"
                docType="CITIZENSHIP_BACK"
                employeeId={myEmployee.id}
                existingDoc={getMyDocByType('CITIZENSHIP_BACK')}
                description="Back side of citizenship"
              />
              <DocumentUploadCard
                title="PAN Card"
                docType="PAN_CARD"
                employeeId={myEmployee.id}
                existingDoc={getMyDocByType('PAN_CARD')}
                description="Personal PAN card"
              />
            </div>
          )}
        </TabsContent>

        {/* All Documents Tab */}
        <TabsContent value="all" className="space-y-6">

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs mb-1 block">Document Type</Label>
              <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {DOC_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Documents
          </CardTitle>
          <CardDescription>
            {documents?.length || 0} document(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.employee?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{doc.employee?.position}</p>
                      </div>
                    </TableCell>
                    <TableCell>{doc.doc_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{doc.verifier?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600"
                          onClick={() => {
                            setVerifyDoc(doc);
                            setVerifyStatus('VERIFIED');
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => {
                            setVerifyDoc(doc);
                            setVerifyStatus('REJECTED');
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteDoc(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => { setViewDoc(null); setSignedUrl(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {viewDoc?.doc_type.replace(/_/g, ' ')} - {viewDoc?.employee?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(90vh-100px)]">
            {loadingUrl ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : signedUrl && (
              isImage(viewDoc?.file_url || '') ? (
                <img src={signedUrl} alt="Document" className="w-full h-auto" />
              ) : (
                <iframe src={signedUrl} className="w-full h-[600px]" title="Document" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify/Reject Dialog */}
      <Dialog open={!!verifyDoc} onOpenChange={() => { setVerifyDoc(null); setVerifyRemarks(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyStatus === 'VERIFIED' ? 'Verify' : 'Reject'} Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Employee: <strong>{verifyDoc?.employee?.full_name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Document: <strong>{verifyDoc?.doc_type.replace(/_/g, ' ')}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Remarks {verifyStatus === 'REJECTED' && '(required for rejection)'}</Label>
              <Textarea
                placeholder="Add remarks..."
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVerifyDoc(null); setVerifyRemarks(''); }}>
              Cancel
            </Button>
            <Button
              variant={verifyStatus === 'VERIFIED' ? 'default' : 'destructive'}
              onClick={handleVerify}
              disabled={verifyMutation.isPending || (verifyStatus === 'REJECTED' && !verifyRemarks)}
            >
              {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {verifyStatus === 'VERIFIED' ? 'Verify' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
