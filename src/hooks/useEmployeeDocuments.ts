import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyAdminTeam, notifyStaff, getEmployeeDetails, getCurrentUserName } from '@/lib/hrmNotifications';

export type EmployeeDocType = 'PROFILE_PHOTO' | 'CITIZENSHIP_FRONT' | 'CITIZENSHIP_BACK' | 'PAN_CARD' | 'COMPANY_REQUIREMENT_DOC' | 'OTHER';
export type EmployeeDocStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  doc_type: EmployeeDocType;
  title: string | null;
  file_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
  verified_by: string | null;
  verified_at: string | null;
  status: EmployeeDocStatus;
  remarks: string | null;
  created_at: string;
  // Joined data
  uploader?: { name: string } | null;
  verifier?: { name: string } | null;
  employee?: { full_name: string; position: string | null } | null;
}

export interface EmployeeGuardianInfo {
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  citizenship_number: string | null;
  pan_number: string | null;
}

// Hook to get documents for an employee
export function useEmployeeDocuments(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          *,
          uploader:profiles!employee_documents_uploaded_by_fkey(name),
          verifier:profiles!employee_documents_verified_by_fkey(name)
        `)
        .eq('employee_id', employeeId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as unknown as EmployeeDocument[];
    },
    enabled: !!employeeId,
  });
}

// Hook to get all documents (for Admin/HR)
export function useAllEmployeeDocuments(filters?: {
  status?: EmployeeDocStatus;
  docType?: EmployeeDocType;
}) {
  return useQuery({
    queryKey: ['all-employee-documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('employee_documents')
        .select(`
          *,
          uploader:profiles!employee_documents_uploaded_by_fkey(name),
          verifier:profiles!employee_documents_verified_by_fkey(name),
          employee:employees!employee_documents_employee_id_fkey(full_name, position)
        `)
        .order('uploaded_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.docType) {
        query = query.eq('doc_type', filters.docType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EmployeeDocument[];
    },
  });
}

// Hook to upload a document
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      docType,
      title,
      file,
      userId,
    }: {
      employeeId: string;
      docType: EmployeeDocType;
      title?: string;
      file: File;
      userId: string;
    }) => {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${docType}-${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('employee-docs')
        .upload(fileName, file, { upsert: false });

      if (storageError) throw storageError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-docs')
        .getPublicUrl(fileName);

      // Create document record
      const { data, error } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          doc_type: docType,
          title: title || null,
          file_url: urlData.publicUrl,
          uploaded_by: userId,
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-employee-documents'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });

      // Notify admin team about new document upload
      try {
        const employee = await getEmployeeDetails(variables.employeeId);
        const actorName = await getCurrentUserName();
        
        if (employee?.store_id) {
          await notifyAdminTeam({
            type: 'DOCUMENT_UPLOADED',
            title: 'New Document Uploaded',
            message: `${employee.full_name} uploaded a ${variables.docType.replace(/_/g, ' ').toLowerCase()} document for review`,
            actorId: variables.userId,
            actorName,
            storeId: employee.store_id,
            linkPath: '/hrm/staff-documents',
            entityType: 'document',
            entityId: data.id,
          });
        }
      } catch (e) {
        console.error('Failed to send document upload notification:', e);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });
}

// Hook to verify/reject a document (Admin/HR only)
export function useVerifyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      status,
      remarks,
      verifierId,
      employeeId,
    }: {
      documentId: string;
      status: EmployeeDocStatus;
      remarks?: string;
      verifierId: string;
      employeeId?: string;
    }) => {
      const { data, error } = await supabase
        .from('employee_documents')
        .update({
          status,
          remarks: remarks || null,
          verified_by: verifierId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select('*, employees:employee_id(full_name, user_id, store_id)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      toast.success('Document status updated');
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      queryClient.invalidateQueries({ queryKey: ['all-employee-documents'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });

      // Notify the staff member about document approval/rejection
      try {
        const employee = (data as any).employees;
        if (employee?.user_id) {
          const actorName = await getCurrentUserName();
          const statusText = variables.status === 'VERIFIED' ? 'approved' : 'rejected';
          const notificationType = variables.status === 'VERIFIED' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED';
          
          await notifyStaff({
            type: notificationType,
            title: `Document ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
            message: `Your ${(data as any).doc_type?.replace(/_/g, ' ').toLowerCase() || 'document'} has been ${statusText}${variables.remarks ? `: ${variables.remarks}` : ''}`,
            targetUserId: employee.user_id,
            actorId: variables.verifierId,
            actorName,
            storeId: employee.store_id,
            linkPath: '/my-hr/documents',
            entityType: 'document',
            entityId: data.id,
          });
        }
      } catch (e) {
        console.error('Failed to send document status notification:', e);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update document');
    },
  });
}

// Hook to delete a document (Admin/HR only)
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, fileUrl }: { documentId: string; fileUrl: string }) => {
      // Extract file path from URL
      const urlParts = fileUrl.split('/employee-docs/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('employee-docs').remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      queryClient.invalidateQueries({ queryKey: ['all-employee-documents'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });
}

// Hook to update guardian info
export function useUpdateGuardianInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: EmployeeGuardianInfo;
    }) => {
      const { error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Information updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-detail', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['my-employee-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update information');
    },
  });
}

// Hook to get current user's employee profile
export function useMyEmployeeProfile() {
  return useQuery({
    queryKey: ['my-employee-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// Get signed URL for private files
export async function getSignedDocumentUrl(fileUrl: string): Promise<string> {
  // Extract file path from URL
  const urlParts = fileUrl.split('/employee-docs/');
  if (urlParts.length <= 1) return fileUrl;
  
  const filePath = decodeURIComponent(urlParts[1]);
  
  const { data, error } = await supabase.storage
    .from('employee-docs')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error getting signed URL:', error);
    return fileUrl;
  }
  
  return data.signedUrl;
}
