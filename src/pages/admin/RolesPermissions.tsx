import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Eye, Edit, Trash, Download, Settings } from 'lucide-react';
import { 
  useSystemModules, 
  useSystemRoles, 
  useAllRolePermissions,
  useUpdateRolePermission,
  useCreateRole 
} from '@/hooks/useRBAC';
import { toast } from 'sonner';

export default function RolesPermissions() {
  const { data: modules = [] } = useSystemModules();
  const { data: roles = [] } = useSystemRoles();
  const { data: allPermissions = [] } = useAllRolePermissions();
  const updatePermission = useUpdateRolePermission();
  const createRole = useCreateRole();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    role_key: '',
    display_name: '',
    description: '',
  });

  const getPermissionForRoleModule = (roleId: string, moduleId: string) => {
    return allPermissions.find(p => p.role_id === roleId && p.module_id === moduleId);
  };

  const handlePermissionToggle = async (
    roleId: string,
    moduleId: string,
    permissionType: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export' | 'can_manage_settings',
    currentValue: boolean
  ) => {
    await updatePermission.mutateAsync({
      roleId,
      moduleId,
      permissions: {
        [permissionType]: !currentValue,
      },
    });
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRole.mutateAsync(newRoleData);
    setIsCreatingRole(false);
    setNewRoleData({ role_key: '', display_name: '', description: '' });
  };

  const permissionIcons = {
    can_view: <Eye className="w-4 h-4" />,
    can_create: <Plus className="w-4 h-4" />,
    can_edit: <Edit className="w-4 h-4" />,
    can_delete: <Trash className="w-4 h-4" />,
    can_export: <Download className="w-4 h-4" />,
    can_manage_settings: <Settings className="w-4 h-4" />,
  };

  const permissionLabels = {
    can_view: 'View',
    can_create: 'Create',
    can_edit: 'Edit',
    can_delete: 'Delete',
    can_export: 'Export',
    can_manage_settings: 'Settings',
  };

  const groupedModules = modules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof modules>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground">
            Manage user roles and module access permissions
          </p>
        </div>
        <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role_key">Role Key *</Label>
                <Input
                  id="role_key"
                  value={newRoleData.role_key}
                  onChange={(e) => setNewRoleData({ ...newRoleData, role_key: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                  placeholder="CUSTOM_ROLE"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Uppercase with underscores (e.g., WAREHOUSE_MANAGER)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  value={newRoleData.display_name}
                  onChange={(e) => setNewRoleData({ ...newRoleData, display_name: e.target.value })}
                  placeholder="Warehouse Manager"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  placeholder="Role description..."
                />
              </div>
              <Button type="submit" className="w-full">
                Create Role
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={roles[0]?.id} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {roles.map(role => (
            <TabsTrigger key={role.id} value={role.id} className="gap-2">
              {role.display_name}
              {role.is_system_role && <Badge variant="secondary" className="text-xs">System</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map(role => (
          <TabsContent key={role.id} value={role.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {role.display_name} Permissions
                </CardTitle>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {Object.entries(groupedModules).map(([category, categoryModules]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h3>
                    <div className="space-y-2">
                      {categoryModules.map(module => {
                        const permission = getPermissionForRoleModule(role.id, module.id);
                        
                        return (
                          <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium">{module.display_name}</p>
                              {module.description && (
                                <p className="text-xs text-muted-foreground">{module.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              {Object.entries(permissionIcons).map(([key, icon]) => (
                                <div key={key} className="flex flex-col items-center gap-1">
                                  <div className="text-muted-foreground" title={permissionLabels[key as keyof typeof permissionLabels]}>
                                    {icon}
                                  </div>
                                  <Switch
                                    checked={permission?.[key as keyof typeof permission] as boolean || false}
                                    onCheckedChange={() => 
                                      handlePermissionToggle(
                                        role.id, 
                                        module.id, 
                                        key as any,
                                        permission?.[key as keyof typeof permission] as boolean || false
                                      )
                                    }
                                    disabled={updatePermission.isPending}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}