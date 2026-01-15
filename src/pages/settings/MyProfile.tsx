import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, User, Eye, EyeOff, Pencil, Save, X } from 'lucide-react';

export default function MyProfile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Profile editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editName.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your name has been updated.",
      });
      setIsEditingName(false);
      // Trigger a page reload to refresh profile in context
      window.location.reload();
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: "Error",
        description: "Failed to update name. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePhone = async () => {
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: editPhone.trim() || null })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your phone number has been updated.",
      });
      setIsEditingPhone(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: "Error",
        description: "Failed to update phone. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // First verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });

      if (signInError) {
        toast({
          title: "Error",
          description: "Incorrect current password.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to update password. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Success
      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and password
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Your basic account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Editable Name Field */}
            <div>
              <Label>Name</Label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSavingProfile}
                    placeholder="Enter your name"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSaveName}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditName(profile?.name || '');
                    }}
                    disabled={isSavingProfile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={profile?.name || ''} disabled className="flex-1" />
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={profile?.role || ''} disabled />
            </div>
            {/* Editable Phone Field */}
            <div>
              <Label>Phone</Label>
              {isEditingPhone ? (
                <div className="flex gap-2">
                  <Input 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={isSavingProfile}
                    placeholder="Enter your phone number"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSavePhone}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => {
                      setIsEditingPhone(false);
                      setEditPhone(profile?.phone || '');
                    }}
                    disabled={isSavingProfile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={profile?.phone || 'Not set'} disabled className="flex-1" />
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => setIsEditingPhone(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isLoading}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
