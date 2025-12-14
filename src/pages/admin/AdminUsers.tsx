import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { useEmployees } from '@/hooks/useHRM';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Search, UserX, UserCheck, Edit, UserPlus, Copy, Eye, EyeOff, Shield, CheckCircle, XCircle, Trash2, KeyRound, Loader2, LogIn, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useStores } from '@/hooks/useStores';
import { useAssignUserToStore, useUserStoreAccess, useRemoveUserFromStore } from '@/hooks/useUserStoreAccess';
import { roleColors, ROLE_OPTIONS, ALL_ROLES, getRoleDisplayLabel, isAdminRole, type AppRole } from '@/lib/roleUtils';

// Generate a secure random password
function generatePassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export default function AdminUsers() {
  const { profile } = useAuth();
  const { currentStore } = useCurrentStore();
  const isOwnerRole = isAdminRole(profile?.role); // OWNER role (displays as "Admin")
  const isManagerRole = profile?.role === 'ADMIN'; // ADMIN role (displays as "Manager")
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  
  // Fetch all stores for OWNER filter
  const { data: allStores = [] } = useStores();
  
  // Fetch user store associations for OWNER view
  const { data: userStoreAccess = [] } = useQuery({
    queryKey: ['all-user-store-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_store_access')
        .select(`
          user_id,
          store_id,
          access_level,
          store:stores(id, name, slug)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOwnerRole,
  });
  
  // Create a map of user_id -> store info
  const userStoreMap = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    userStoreAccess.forEach((access: any) => {
      if (access.store) {
        const existing = map.get(access.user_id) || [];
        existing.push(access.store);
        map.set(access.user_id, existing);
      }
    });
    return map;
  }, [userStoreAccess]);
  
  // Determine includeInactive based on statusFilter
  const includeInactive = statusFilter === 'ALL' || statusFilter === 'INACTIVE';
  
  // For OWNER: use store dropdown filter (storeFilter), if 'ALL' show all users
  // For Manager (ADMIN role): always use currentStore from context (their assigned store only)
  const effectiveStoreId = isOwnerRole 
    ? (storeFilter !== 'ALL' ? storeFilter : undefined)
    : currentStore?.id;
  
  // Include OWNER role users in AdminUsers page when filtering by store
  const { data: staff = [], isLoading } = useStaff(undefined, includeInactive, effectiveStoreId, true);
  const { data: employees = [] } = useEmployees();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<StaffMember | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleImpersonate = async (user: StaffMember) => {
    if (user.id === profile?.id) {
      toast.error("You cannot login as yourself");
      return;
    }

    setIsImpersonating(user.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Your session has expired. Please log in again.");
        setIsImpersonating(null);
        return;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/impersonate-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ targetUserId: user.id, redirectOrigin: 'https://erp.techlaya.com' })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to impersonate user');
      }

      // Open the login URL in a new tab
      window.open(result.loginUrl, '_blank');
      toast.success(`Opening login session for ${user.name}`);
    } catch (error: unknown) {
      console.error('Impersonation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to login as user';
      toast.error(errorMessage);
    } finally {
      setIsImpersonating(null);
    }
  };

const usersWithEmployee = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(e => {
      if (e.user_id) map.set(e.user_id, e.id);
    });
    return map;
  }, [employees]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CALLING' as AppRole,
  });
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [selectedStoreRoles, setSelectedStoreRoles] = useState<Record<string, AppRole>>({});
  const assignStoreMutation = useAssignUserToStore();
  const removeStoreMutation = useRemoveUserFromStore();

  // Edit user store state
  const [editSelectedStoreIds, setEditSelectedStoreIds] = useState<string[]>([]);
  const [editSelectedStoreRoles, setEditSelectedStoreRoles] = useState<Record<string, AppRole>>({});

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CALLING' as AppRole,
  });

  // Fetch editing user's current store access
  const { data: editingUserStoreAccess = [] } = useUserStoreAccess(editingUser?.id);

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    
    // Status filtering is now done at DB level, but we need additional client-side filtering
    // when statusFilter is 'INACTIVE' (since DB returns all when includeInactive=true but we want only inactive)
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && s.is_active) ||
      (statusFilter === 'INACTIVE' && !s.is_active);
    
    // Store filter is now handled at DB level via effectiveStoreId
    return matchesSearch && matchesRole && matchesStatus;
  });


  const handleToggleStatus = async (user: StaffMember) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch (error: any) {
      toast.error(`Failed to update role: ${error.message}`);
    }
  };

  const openEditDialog = (user: StaffMember) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
    });
    // Reset edit store state - will be populated by useEffect
    setEditSelectedStoreIds([]);
    setEditSelectedStoreRoles({});
    setIsEditOpen(true);
  };

  // Effect to populate store state when editing user's store access loads
  useEffect(() => {
    if (editingUser && isEditOpen) {
      if (editingUserStoreAccess.length > 0) {
        const storeIds = editingUserStoreAccess.map(a => a.store_id);
        const storeRoles: Record<string, AppRole> = {};
        editingUserStoreAccess.forEach(a => {
          // Use store_role if set, otherwise fall back to user's global role
          storeRoles[a.store_id] = (a.store_role as AppRole) || editingUser.role;
        });
        setEditSelectedStoreIds(storeIds);
        setEditSelectedStoreRoles(storeRoles);
      } else {
        // No store access records - reset state
        setEditSelectedStoreIds([]);
        setEditSelectedStoreRoles({});
      }
    }
  }, [editingUser?.id, editingUserStoreAccess, isEditOpen, editingUser?.role]);

  const toggleEditStoreSelection = (storeId: string) => {
    setEditSelectedStoreIds(prev => {
      if (prev.includes(storeId)) {
        const newRoles = { ...editSelectedStoreRoles };
        delete newRoles[storeId];
        setEditSelectedStoreRoles(newRoles);
        return prev.filter(id => id !== storeId);
      } else {
        return [...prev, storeId];
      }
    });
  };

  const setEditStoreRole = (storeId: string, role: AppRole) => {
    setEditSelectedStoreRoles(prev => ({ ...prev, [storeId]: role }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsSubmitting(true);
    try {
      // Check if email changed - need to call edge function
      if (editFormData.email !== editingUser.email) {
        const response = await supabase.functions.invoke('update-user-email', {
          body: {
            userId: editingUser.id,
            newEmail: editFormData.email.trim(),
          },
        });

        if (response.error) {
          let errorMsg = 'Failed to update email';
          const errorMessage = response.error.message || '';
          try {
            const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.error) errorMsg = parsed.error;
            }
          } catch {
            if (errorMessage && errorMessage !== 'FunctionsHttpError') {
              errorMsg = errorMessage;
            }
          }
          throw new Error(errorMsg);
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }
      }

      // Update profile (name, phone, role)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editFormData.name,
          phone: editFormData.phone || null,
          role: editFormData.role,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editFormData.role })
        .eq('user_id', editingUser.id);

      if (roleError) throw roleError;

      // Handle store assignments for OWNER
      if (isOwnerRole && editingUser.role !== 'OWNER') {
        const currentStoreIds = editingUserStoreAccess.map(a => a.store_id);
        
        // Remove stores that were deselected
        for (const storeId of currentStoreIds) {
          if (!editSelectedStoreIds.includes(storeId)) {
            try {
              await removeStoreMutation.mutateAsync({ userId: editingUser.id, storeId });
            } catch (err) {
              console.error('Failed to remove store:', storeId, err);
            }
          }
        }
        
        // Add or update stores
        for (const storeId of editSelectedStoreIds) {
          try {
            await assignStoreMutation.mutateAsync({
              user_id: editingUser.id,
              store_id: storeId,
              access_level: 'staff',
              store_role: editSelectedStoreRoles[storeId] || null,
            });
          } catch (err) {
            console.error('Failed to assign store:', storeId, err);
          }
        }
      }

      toast.success('User updated successfully');
      setIsEditOpen(false);
      setEditingUser(null);
      setEditSelectedStoreIds([]);
      setEditSelectedStoreRoles({});
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-store-access'] });
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    // Validation
    if (!newPassword || !confirmNewPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            userId: resetPasswordUser.id,
            newPassword
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      toast.success("Password reset successfully. Share the new password with the user.");

      // Close modal and reset form
      setIsResetPasswordOpen(false);
      setResetPasswordUser(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || "Failed to reset password. Please try again.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Non-OWNER users must have a current store to create users
    if (!isOwnerRole && !currentStore?.id) {
      toast.error('No store context. Please access this page from a store portal.');
      return;
    }

    // OWNER must select at least one store if stores exist
    if (isOwnerRole && allStores.length > 0 && selectedStoreIds.length === 0) {
      toast.error('Please select at least one store for this user.');
      return;
    }
    
    setIsSubmitting(true);
    setCreatedCredentials(null);

    const tempPassword = generatePassword();

    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: tempPassword,
          name: formData.name,
          phone: formData.phone || null,
          role: formData.role,
          // Always pass current store_id for non-OWNER users
          store_id: isOwnerRole ? undefined : currentStore?.id,
        },
      });

      // Handle edge function errors (non-2xx responses)
      if (response.error) {
        let errorMsg = 'Failed to create user';
        
        // The error message from supabase.functions.invoke often contains JSON
        const errorMessage = response.error.message || '';
        
        // Try to parse JSON from the error message
        try {
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error) {
              errorMsg = parsed.error;
            }
          }
        } catch {
          // If parsing fails, try to extract just the error text
          const simpleMatch = errorMessage.match(/"error"\s*:\s*"([^"]+)"/);
          if (simpleMatch) {
            errorMsg = simpleMatch[1];
          } else if (errorMessage && errorMessage !== 'FunctionsHttpError') {
            errorMsg = errorMessage;
          }
        }
        
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Handle application-level errors from edge function
      if (response.data?.error) {
        toast.error(response.data.error);
        setIsSubmitting(false);
        return;
      }

      const createdUserId = response.data?.user?.id;

      // For OWNER: Assign selected stores with per-store roles
      if (isOwnerRole && createdUserId && selectedStoreIds.length > 0) {
        for (const storeId of selectedStoreIds) {
          try {
            await assignStoreMutation.mutateAsync({
              user_id: createdUserId,
              store_id: storeId,
              access_level: 'staff',
              store_role: selectedStoreRoles[storeId] || null,
            });
          } catch (err) {
            console.error('Failed to assign store:', storeId, err);
          }
        }
      }

      // Success
      setCreatedCredentials({ email: formData.email, password: tempPassword });
      toast.success('User created successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-store-access'] });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAddDialog = () => {
    setIsOpen(false);
    setCreatedCredentials(null);
    setFormData({ name: '', email: '', phone: '', role: 'CALLING' });
    setSelectedStoreIds([]);
    setSelectedStoreRoles({});
    setShowPassword(false);
  };

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStoreIds(prev => {
      if (prev.includes(storeId)) {
        // Remove store and its role
        const newRoles = { ...selectedStoreRoles };
        delete newRoles[storeId];
        setSelectedStoreRoles(newRoles);
        return prev.filter(id => id !== storeId);
      } else {
        return [...prev, storeId];
      }
    });
  };

  const setStoreRole = (storeId: string, role: AppRole) => {
    setSelectedStoreRoles(prev => ({ ...prev, [storeId]: role }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleCreateEmployee = (user: StaffMember) => {
    navigate(`/hrm/employees?prefillUser=${user.id}`);
  };

  const openDeleteDialog = (user: StaffMember) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch (error: any) {
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  const canDeleteUser = (user: StaffMember): boolean => {
    // Cannot delete yourself
    if (profile?.id === user.id) return false;
    // OWNER can delete anyone (including ADMIN)
    if (profile?.role === 'OWNER') return true;
    // ADMIN cannot delete OWNER
    if (user.role === 'OWNER') return false;
    // ADMIN can delete others
    if (profile?.role === 'ADMIN') return true;
    return false;
  };

  // Check if current user can edit another user's role
  const canEditUser = (user: StaffMember): boolean => {
    // Cannot edit yourself
    if (profile?.id === user.id) return false;
    // OWNER can edit anyone
    if (profile?.role === 'OWNER') return true;
    // ADMIN cannot edit OWNER
    if (user.role === 'OWNER') return false;
    // ADMIN can edit others
    if (profile?.role === 'ADMIN') return true;
    return false;
  };

  // Get available roles for editing based on current user's role
  const getAvailableRoles = (): AppRole[] => {
    if (profile?.role === 'OWNER') {
      return ALL_ROLES; // OWNER can assign any role including OWNER and ADMIN
    }
    // ADMIN cannot assign OWNER role
    return ALL_ROLES.filter(r => r !== 'OWNER');
  };

  const activeCount = staff.filter(s => s.is_active).length;
  const inactiveCount = staff.filter(s => !s.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">
            {activeCount} active, {inactiveCount} inactive users
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleCloseAddDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setFormData({ name: '', email: '', phone: '', role: 'CALLING' });
              setCreatedCredentials(null);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{createdCredentials ? 'User Created Successfully' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            
            {createdCredentials ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-3">
                    Share these credentials with the new user:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={createdCredentials.email} readOnly className="font-mono text-sm" />
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdCredentials.email)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          value={createdCredentials.password} 
                          readOnly 
                          className="font-mono text-sm" 
                        />
                        <Button size="icon" variant="outline" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdCredentials.password)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  The user should change their password after first login.
                </p>
                <Button onClick={handleCloseAddDialog} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+977 98XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={formData.role} onValueChange={(v: AppRole) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles().map((role) => (
                        <SelectItem key={role} value={role}>{getRoleDisplayLabel(role)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Store Selection for OWNER */}
                {isOwnerRole && allStores.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assign to Stores *</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {allStores.map((store) => (
                        <div key={store.id} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`store-${store.id}`}
                              checked={selectedStoreIds.includes(store.id)}
                              onCheckedChange={() => toggleStoreSelection(store.id)}
                            />
                            <label
                              htmlFor={`store-${store.id}`}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              {store.name}
                            </label>
                          </div>
                          {selectedStoreIds.includes(store.id) && (
                            <div className="ml-6">
                              <Select
                                value={selectedStoreRoles[store.id] || ''}
                                onValueChange={(v: AppRole) => setStoreRole(store.id, v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select role for this store" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRoles().filter(r => r !== 'OWNER').map((role) => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select stores and optionally assign different roles per store
                    </p>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                  A secure temporary password will be generated automatically.
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editFormData.role} onValueChange={(v: AppRole) => setEditFormData({ ...editFormData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role} value={role}>{getRoleDisplayLabel(role)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Store Assignment - OWNER can assign to any user including other OWNERs */}
            {isOwnerRole && allStores.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to Stores</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {allStores.map((store) => (
                    <div key={store.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-store-${store.id}`}
                          checked={editSelectedStoreIds.includes(store.id)}
                          onCheckedChange={() => toggleEditStoreSelection(store.id)}
                        />
                        <label
                          htmlFor={`edit-store-${store.id}`}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {store.name}
                        </label>
                      </div>
                      {editSelectedStoreIds.includes(store.id) && (
                        <div className="ml-6">
                          <Select
                            value={editSelectedStoreRoles[store.id] || ''}
                            onValueChange={(v: AppRole) => setEditStoreRole(store.id, v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select role for this store" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableRoles().filter(r => r !== 'OWNER').map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select stores and optionally assign different roles per store
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Staff Members
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{getRoleDisplayLabel(role)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ALL">All Status</SelectItem>
                </SelectContent>
              </Select>
              {isOwnerRole && (
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Store className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Stores</SelectItem>
                    {allStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Name</TableHead>
                  <TableHead className="table-header">Email</TableHead>
                  <TableHead className="table-header">Phone</TableHead>
                  <TableHead className="table-header">Role</TableHead>
                  {isOwnerRole && <TableHead className="table-header">Store</TableHead>}
                  <TableHead className="table-header">Employee</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((user) => {
                  const hasEmployee = usersWithEmployee.has(user.id);
                  const userStores = userStoreMap.get(user.id) || [];
                  return (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[user.role]}>
                          {getRoleDisplayLabel(user.role)}
                        </Badge>
                      </TableCell>
                      {isOwnerRole && (
                        <TableCell>
                          {user.role === 'OWNER' ? (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              All Stores
                            </Badge>
                          ) : userStores.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {userStores.map(store => (
                                <Badge key={store.id} variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                                  <Store className="w-3 h-3 mr-1" />
                                  {store.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No store</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {hasEmployee ? (
                          <Badge 
                            variant="outline" 
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 cursor-pointer"
                            onClick={() => navigate('/hrm/employees')}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => handleCreateEmployee(user)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Create
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEditUser(user) && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(user)}
                                title="Edit User"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleStatus(user)}
                                title={user.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                          {(profile?.role === 'ADMIN' || profile?.role === 'OWNER') && user.id !== profile.id && canEditUser(user) && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                onClick={() => {
                                  setResetPasswordUser(user);
                                  setIsResetPasswordOpen(true);
                                }}
                                title="Reset Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                onClick={() => handleImpersonate(user)}
                                disabled={isImpersonating === user.id}
                                title="Login as User"
                              >
                                {isImpersonating === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <LogIn className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwnerRole ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This will remove their access to Vakari Vision. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordUser?.name} ({resetPasswordUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={(profile?.role === 'OWNER' || profile?.role === 'ADMIN') && showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={isResettingPassword}
                  className={(profile?.role === 'OWNER' || profile?.role === 'ADMIN') ? "pr-10" : ""}
                />
                {(profile?.role === 'OWNER' || profile?.role === 'ADMIN') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isResettingPassword}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={(profile?.role === 'OWNER' || profile?.role === 'ADMIN') && showConfirmNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={isResettingPassword}
                  className={(profile?.role === 'OWNER' || profile?.role === 'ADMIN') ? "pr-10" : ""}
                />
                {(profile?.role === 'OWNER' || profile?.role === 'ADMIN') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    disabled={isResettingPassword}
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetPasswordOpen(false);
                setResetPasswordUser(null);
                setNewPassword('');
                setConfirmNewPassword('');
                setShowNewPassword(false);
                setShowConfirmNewPassword(false);
              }}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              variant="destructive"
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Save New Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
