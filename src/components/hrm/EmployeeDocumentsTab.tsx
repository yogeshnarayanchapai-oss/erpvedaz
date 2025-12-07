import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, CheckCircle, XCircle, Trash2, Loader2, Shield, FileText, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useEmployeeDocuments,
  useVerifyDocument,
  useDeleteDocument,
  EmployeeDocument,
  EmployeeDocStatus,
  getSignedDocumentUrl,
} from '@/hooks/useEmployeeDocuments';
import { useAuth } from '@/contexts/AuthContext';

interface EmployeeDocumentsTabProps {
  employeeId: string;
  employee: {
    guardian_name?: string | null;
    guardian_relation?: string | null;
    guardian_phone?: string | null;
    citizenship_number?: string | null;
    pan_number?: string | null;
  };
}

export function EmployeeDocumentsTab({ employeeId, employee }: EmployeeDocumentsTabProps) {
  const { user } = useAuth();
  const { data: documents, isLoading } = useEmployeeDocuments(employeeId);
  
  const [viewDoc, setViewDoc] = useState<EmployeeDocument | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  
  const [verifyDoc, setVerifyDoc] = useState<EmployeeDocument | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<EmployeeDocStatus>('VERIFIED');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  
  const [deleteDoc, setDeleteDoc] = useState<EmployeeDocument | null>(null);

  const verifyMutation = useVerifyDocument();
  const deleteMutation = useDeleteDocument();

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

  const getDocByType = (type: string): EmployeeDocument | undefined => {
    return documents?.find(d => d.doc_type === type);
  };

  const isImage = (url: string) => url?.match(/\.(jpg|jpeg|png|webp)$/i);

  const renderDocCard = (docType: string, title: string) => {
    const doc = getDocByType(docType);
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {doc && getStatusBadge(doc.status)}
          </div>
        </CardHeader>
        <CardContent>
          {doc ? (
            <div className="space-y-2">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {isImage(doc.file_url) ? (
                  <img src={doc.file_url} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleView(doc)}>
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600"
                  onClick={() => { setVerifyDoc(doc); setVerifyStatus('VERIFIED'); }}
                >
                  <CheckCircle className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  onClick={() => { setVerifyDoc(doc); setVerifyStatus('REJECTED'); }}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteDoc(doc)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Not uploaded</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Document Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderDocCard('PROFILE_PHOTO', 'Profile Photo')}
        {renderDocCard('CITIZENSHIP_FRONT', 'Citizenship (Front)')}
        {renderDocCard('CITIZENSHIP_BACK', 'Citizenship (Back)')}
        {renderDocCard('PAN_CARD', 'PAN Card')}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderDocCard('COMPANY_REQUIREMENT_DOC', 'Company Document')}
        
        {/* Emergency Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Emergency Contact & KYC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Guardian Name</p>
                <p className="font-medium">{employee.guardian_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Relation</p>
                <p className="font-medium">{employee.guardian_relation || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Guardian Phone</p>
                <p className="font-medium">{employee.guardian_phone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Citizenship No.</p>
                <p className="font-medium">{employee.citizenship_number || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">PAN Number</p>
                <p className="font-medium">{employee.pan_number || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>{documents?.length || 0} document(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.doc_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{doc.title || '-'}</TableCell>
                    <TableCell>{format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{doc.verifier?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDoc(doc)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No documents</div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => { setViewDoc(null); setSignedUrl(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewDoc?.doc_type.replace(/_/g, ' ')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(90vh-100px)]">
            {loadingUrl ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : signedUrl && (
              isImage(viewDoc?.file_url || '') ? (
                <img src={signedUrl} alt="Document" className="w-full" />
              ) : (
                <iframe src={signedUrl} className="w-full h-[600px]" title="Document" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={!!verifyDoc} onOpenChange={() => { setVerifyDoc(null); setVerifyRemarks(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{verifyStatus === 'VERIFIED' ? 'Verify' : 'Reject'} Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Document: <strong>{verifyDoc?.doc_type.replace(/_/g, ' ')}</strong>
            </p>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Add remarks..."
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVerifyDoc(null); setVerifyRemarks(''); }}>Cancel</Button>
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

      {/* Delete Dialog */}
      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this document?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
