import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Plus, Eye, Edit, Trash, Download, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  useSystemModules,
  useSystemRoles,
  useAllRolePermissions,
  useUpdateRolePermission,
  useCreateRole,
} from '@/hooks/useRBAC';
import { toast } from 'sonner';

const PERMISSION_KEYS = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export', 'can_manage_settings'] as const;
type PermKey = typeof PERMISSION_KEYS[number];

const permissionMeta: Record<PermKey, { icon: typeof Eye; label: string }> = {
  can_view: { icon: Eye, label: 'View' },
  can_create: { icon: Plus, label: 'Create' },
  can_edit: { icon: Edit, label: 'Edit' },
  can_delete: { icon: Trash, label: 'Delete' },
  can_export: { icon: Download, label: 'Export' },
  can_manage_settings: { icon: Settings, label: 'Settings' },
};

const CATEGORY_ORDER = ['Dashboard', 'Sales', 'Inventory', 'Accounting', 'Marketing', 'HRM', 'Logistics', 'Admin', 'Staff Self-Service'];

export default function RolesPermissions() {
  const { data: modules = [] } = useSystemModules();
  const { data: roles = [] } = useSystemRoles();
  const { data: allPermissions = [] } = useAllRolePermissions();
  const updatePermission = useUpdateRolePermission();
  const createRole = useCreateRole();

  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ role_key: '', display_name: '', description: '' });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));

  const getPermission = (roleId: string, moduleId: string) => {
    return allPermissions.find(p => p.role_id === roleId && p.module_id === moduleId);
  };

  const handleToggle = async (roleId: string, moduleId: string, key: PermKey, current: boolean) => {
    await updatePermission.mutateAsync({
      roleId,
      moduleId,
      permissions: { [key]: !current },
    });
  };

  const handleBulkToggle = async (roleId: string, categoryModuleIds: string[], key: PermKey, enable: boolean) => {
    for (const moduleId of categoryModuleIds) {
      await updatePermission.mutateAsync({
        roleId,
        moduleId,
        permissions: { [key]: enable },
      });
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRole.mutateAsync(newRoleData);
    setIsCreatingRole(false);
    setNewRoleData({ role_key: '', display_name: '', description: '' });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Group modules by category in defined order
  const groupedModules = CATEGORY_ORDER.map(cat => ({
    category: cat,
    modules: modules.filter(m => m.category === cat).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  })).filter(g => g.modules.length > 0);

  // Check if all modules in a category have a specific permission
  const isCategoryAllEnabled = (roleId: string, moduleIds: string[], key: PermKey) => {
    return moduleIds.every(id => {
      const p = getPermission(roleId, id);
      return p?.[key] ?? false;
    });
  };

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
            <Button><Plus className="w-4 h-4 mr-2" />Create Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Role</DialogTitle></DialogHeader>
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
                <p className="text-xs text-muted-foreground">Uppercase with underscores (e.g., WAREHOUSE_MANAGER)</p>
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
                <Textarea
                  id="description"
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  placeholder="Role description..."
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full">Create Role</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={roles[0]?.id} className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {roles.map(role => (
              <TabsTrigger key={role.id} value={role.id} className="gap-1.5 text-xs sm:text-sm">
                {role.display_name}
                {role.is_system_role && <Badge variant="secondary" className="text-[10px] px-1 py-0">System</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {roles.map(role => (
          <TabsContent key={role.id} value={role.id} className="space-y-3">
            {role.description && (
              <p className="text-sm text-muted-foreground px-1">{role.description}</p>
            )}

            {/* Permission header labels */}
            <div className="hidden md:flex items-center justify-end gap-2 pr-3 pb-1">
              {PERMISSION_KEYS.map(key => {
                const Icon = permissionMeta[key].icon;
                return (
                  <div key={key} className="w-14 flex flex-col items-center gap-0.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{permissionMeta[key].label}</span>
                  </div>
                );
              })}
            </div>

            {groupedModules.map(({ category, modules: catModules }) => {
              const isExpanded = expandedCategories.has(category);
              const moduleIds = catModules.map(m => m.id);

              return (
                <Card key={category} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <CardTitle className="text-sm font-semibold">{category}</CardTitle>
                            <Badge variant="outline" className="text-xs">{catModules.length} modules</Badge>
                          </div>
                          {/* Category-level bulk toggles */}
                          <div className="hidden md:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {PERMISSION_KEYS.map(key => {
                              const allEnabled = isCategoryAllEnabled(role.id, moduleIds, key);
                              return (
                                <div key={key} className="w-14 flex justify-center">
                                  <Checkbox
                                    checked={allEnabled}
                                    onCheckedChange={(checked) => {
                                      handleBulkToggle(role.id, moduleIds, key, !!checked);
                                    }}
                                    className="h-4 w-4"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {catModules.map(module => {
                            const perm = getPermission(role.id, module.id);
                            return (
                              <div key={module.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{module.display_name}</p>
                                  {module.description && (
                                    <p className="text-xs text-muted-foreground truncate">{module.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {PERMISSION_KEYS.map(key => {
                                    const Icon = permissionMeta[key].icon;
                                    const isOn = (perm?.[key] as boolean) ?? false;
                                    return (
                                      <div key={key} className="w-14 flex flex-col items-center gap-0.5">
                                        <span className="md:hidden text-[10px] text-muted-foreground">{permissionMeta[key].label}</span>
                                        <Switch
                                          checked={isOn}
                                          onCheckedChange={() => handleToggle(role.id, module.id, key, isOn)}
                                          disabled={updatePermission.isPending}
                                          className="scale-[0.8]"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
