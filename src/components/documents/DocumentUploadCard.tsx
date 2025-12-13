import { useState, useRef } from 'react';
import { Upload, Eye, CheckCircle, XCircle, Clock, FileImage, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EmployeeDocument, EmployeeDocType, useUploadDocument, useDeleteDocument, getSignedDocumentUrl } from '@/hooks/useEmployeeDocuments';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadCardProps {
  title: string;
  docType: EmployeeDocType;
  employeeId: string;
  existingDoc?: EmployeeDocument;
  description?: string;
  allowReplace?: boolean;
}

export function DocumentUploadCard({
  title,
  docType,
  employeeId,
  existingDoc,
  description,
  allowReplace = true,
}: DocumentUploadCardProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  // Document is locked if it's approved - staff cannot edit/delete
  const isApproved = existingDoc?.status === 'VERIFIED';
  const isPending = existingDoc?.status === 'PENDING';
  const isRejected = existingDoc?.status === 'REJECTED';

  // Staff can only edit/delete pending or rejected documents
  const canModify = !isApproved;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    await uploadMutation.mutateAsync({
      employeeId,
      docType,
      title,
      file,
      userId: user.id,
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewDocument = async () => {
    if (!existingDoc) return;
    
    setLoadingUrl(true);
    try {
      const url = await getSignedDocumentUrl(existingDoc.file_url);
      setSignedUrl(url);
      setIsViewOpen(true);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleDelete = async () => {
    if (!existingDoc) return;
    await deleteMutation.mutateAsync({
      documentId: existingDoc.id,
      fileUrl: existingDoc.file_url,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const isImage = existingDoc?.file_url?.match(/\.(jpg|jpeg|png|webp)$/i);

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {existingDoc && getStatusBadge(existingDoc.status)}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {existingDoc ? (
            <div className="space-y-3">
              {/* Thumbnail Preview */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {isImage ? (
                  <img
                    src={existingDoc.file_url}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`flex flex-col items-center justify-center text-muted-foreground ${isImage ? 'hidden' : ''}`}>
                  <FileImage className="w-10 h-10 mb-2" />
                  <span className="text-xs">Document</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleViewDocument}
                  disabled={loadingUrl}
                >
                  {loadingUrl ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-1" />
                  )}
                  View
                </Button>
                {allowReplace && canModify && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    Replace
                  </Button>
                )}
                {canModify && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this document. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Lock message for approved docs */}
              {isApproved && (
                <p className="text-xs text-green-600 bg-green-500/10 p-2 rounded flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  This document is approved and cannot be modified.
                </p>
              )}

              {/* Remarks if rejected */}
              {isRejected && existingDoc.remarks && (
                <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                  Rejection reason: {existingDoc.remarks}
                </p>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {uploadMutation.isPending ? 'Uploading...' : 'Click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP or PDF (max 10MB)
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          <p className="text-xs text-muted-foreground text-center">
            {isApproved ? 'Document locked after approval' : 'Only HR/Admin can approve documents'}
          </p>
        </CardContent>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(90vh-100px)]">
            {signedUrl && (
              isImage ? (
                <img
                  src={signedUrl}
                  alt={title}
                  className="w-full h-auto"
                />
              ) : (
                <iframe
                  src={signedUrl}
                  className="w-full h-[600px]"
                  title={title}
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}