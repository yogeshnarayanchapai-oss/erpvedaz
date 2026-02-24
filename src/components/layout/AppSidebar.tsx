import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { NavLink } from '@/components/NavLink';
import { getRoleDisplayLabel } from '@/lib/roleUtils';
import { MODULE_REGISTRY, SIDEBAR_GROUPS, STANDALONE_MODULES } from '@/lib/moduleRegistry';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Zap, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { SidebarBadge } from './SidebarBadge';
import { useBranding } from '@/hooks/useBranding';

type MenuItem = { title: string; url: string; icon: any; moduleName?: string; children?: MenuItem[] };

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const { canView, viewableModules, isOwner, isLoading } = useMyPermissions();
  const location = useLocation();
  const { data: badges } = useSidebarBadges();
  const { branding } = useBranding();
  const role = effectiveRole;

  // Build menu items from permissions + module registry
  const items = useMemo(() => {
    const result: MenuItem[] = [];
    
    const isModuleVisible = (moduleName: string) => {
      if (isOwner) return true;
      if (!viewableModules) return true;
      return viewableModules.has(moduleName);
    };

    // 1. Add standalone dashboard items first
    const dashboardModules = ['admin_dashboard', 'calling_dashboard', 'leads_dashboard', 'marketing_dashboard', 'hr_dashboard'];
    for (const modName of dashboardModules) {
      if (isModuleVisible(modName)) {
        const entry = MODULE_REGISTRY[modName];
        if (entry) {
          result.push({ title: getModuleTitle(modName), url: entry.url, icon: entry.icon, moduleName: modName });
          break; // Only show the first matching dashboard
        }
      }
    }

    // 2. Add Users group (standalone items) - only for admin-level roles
    const adminStandalone = ['users', 'roles_permissions'];
    const visibleAdminItems = adminStandalone.filter(m => isModuleVisible(m));
    if (visibleAdminItems.length > 0) {
      if (visibleAdminItems.length === 1 && visibleAdminItems[0] === 'users') {
        const entry = MODULE_REGISTRY['users'];
        result.push({ title: 'Users', url: entry.url, icon: entry.icon, moduleName: 'users' });
      } else {
        const children = visibleAdminItems.map(m => ({
          title: getModuleTitle(m),
          url: MODULE_REGISTRY[m].url,
          icon: MODULE_REGISTRY[m].icon,
          moduleName: m,
        }));
        result.push({
          title: 'Users',
          url: MODULE_REGISTRY['users'].url,
          icon: MODULE_REGISTRY['users'].icon,
          children,
        });
      }
    }

    // 3. Stores
    if (isModuleVisible('stores')) {
      const entry = MODULE_REGISTRY['stores'];
      result.push({ title: 'Stores', url: entry.url, icon: entry.icon, moduleName: 'stores' });
    }

    // 4. Add grouped sidebar sections (Sales, Inventory, etc.)
    for (const group of SIDEBAR_GROUPS) {
      const visibleModules = group.modules.filter(m => isModuleVisible(m) && MODULE_REGISTRY[m]);
      if (visibleModules.length === 0) continue;

      const children: MenuItem[] = visibleModules.map(m => ({
        title: getModuleTitle(m),
        url: MODULE_REGISTRY[m].url,
        icon: MODULE_REGISTRY[m].icon,
        moduleName: m,
      }));

      result.push({
        title: group.label,
        url: children[0]?.url || '#',
        icon: group.icon,
        children,
      });
    }

    // 5. Task Management
    if (isModuleVisible('task_management')) {
      const entry = MODULE_REGISTRY['task_management'];
      result.push({ title: 'Task Management', url: entry.url, icon: entry.icon, moduleName: 'task_management' });
    }

    // 6. Standalone calling/leads/logistics items for non-admin roles
    const staffStandalone = ['calling_leads', 'calling_orders', 'calling_reports', 'followup_queue', 'leads_reports', 'logistics_orders'];
    for (const modName of staffStandalone) {
      if (isModuleVisible(modName) && !result.some(r => r.moduleName === modName) && !result.some(r => r.children?.some(c => c.moduleName === modName))) {
        const entry = MODULE_REGISTRY[modName];
        if (entry) {
          result.push({ title: getModuleTitle(modName), url: entry.url, icon: entry.icon, moduleName: modName });
        }
      }
    }

    // 7. Branding, Backup, Settings at bottom
    const bottomStandalone = ['branding', 'backup', 'settings'];
    for (const modName of bottomStandalone) {
      if (isModuleVisible(modName)) {
        const entry = MODULE_REGISTRY[modName];
        if (entry) {
          result.push({ title: getModuleTitle(modName), url: entry.url, icon: entry.icon, moduleName: modName });
        }
      }
    }

    // 8. My Tasks for all staff
    if (isModuleVisible('my_tasks') && !result.some(r => r.moduleName === 'my_tasks')) {
      const entry = MODULE_REGISTRY['my_tasks'];
      result.push({ title: 'My Tasks', url: entry.url, icon: entry.icon, moduleName: 'my_tasks' });
    }

    return result;
  }, [isOwner, viewableModules, canView]);

  const isChildActive = (item: MenuItem) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.url);
  };

  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    for (const item of items) {
      if (item.children && isChildActive(item)) {
        return item.title;
      }
    }
    return null;
  });

  const handleMenuToggle = (menuTitle: string, isOpen: boolean) => {
    setExpandedMenu(isOpen ? menuTitle : null);
  };

  const getBadgeCount = (title: string): number => {
    if (!badges) return 0;
    const titleLower = title.toLowerCase();
    if (titleLower === 'team chat') return badges.teamChat;
    if (titleLower === 'my tasks' || titleLower === 'task management') return badges.myTasks;
    const isStaffRole = !['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(role);
    if (titleLower === 'my hr' && isStaffRole) return badges.myHR + badges.teamChat;
    if (titleLower.includes('lead') && !titleLower.includes('followup')) return badges.leads;
    if (titleLower.includes('order')) return badges.orders;
    if (titleLower.includes('notification')) return badges.notifications;
    if (titleLower.includes('leave') && ['ADMIN', 'HR', 'MANAGER', 'OWNER'].includes(role)) return badges.leaveRequests;
    if (titleLower === 'hrm' && ['ADMIN', 'HR', 'MANAGER', 'OWNER'].includes(role)) return badges.leaveRequests + badges.pendingDocuments + badges.teamChat;
    if (titleLower === 'inventory' && ['ADMIN', 'MANAGER', 'OWNER'].includes(role)) return badges.highAlert;
    return 0;
  };

  const brandName = branding?.brand_name || 'Zivkart OS';
  const logoUrl = branding?.logo_url;

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={`${logoUrl}?t=${branding?.updated_at}`}
              alt="Logo"
              className="w-9 h-9 object-contain rounded-lg"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-sidebar-foreground text-sm truncate max-w-[140px]">
              {brandName.split(' ').slice(0, 2).join(' ')}
            </h2>
            <p className="text-xs text-sidebar-muted">{getRoleDisplayLabel(role)} Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs font-medium px-3 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const badgeCount = getBadgeCount(item.title);
                return item.children ? (
                  <Collapsible
                    key={item.title}
                    open={expandedMenu === item.title}
                    onOpenChange={(open) => handleMenuToggle(item.title, open)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <button
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${
                            isChildActive(item) ? 'bg-sidebar-accent/50 text-sidebar-foreground' : ''
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm flex-1 text-left">{item.title}</span>
                          <SidebarBadge count={badgeCount} />
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === item.title ? 'rotate-180' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const childBadge = getBadgeCount(child.title);
                          return (
                            <SidebarMenuItem key={child.title}>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={child.url}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm"
                                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                                >
                                  <child.icon className="w-4 h-4" />
                                  <span className="flex-1">{child.title}</span>
                                  <SidebarBadge count={childBadge} />
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm flex-1">{item.title}</span>
                        <SidebarBadge count={badgeCount} />
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-muted truncate">{profile?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Map module name to human-readable title */
function getModuleTitle(moduleName: string): string {
  const titleMap: Record<string, string> = {
    admin_dashboard: 'Dashboard',
    sales_dashboard: 'Sales Dashboard',
    calling_dashboard: 'Dashboard',
    leads_dashboard: 'Dashboard',
    marketing_dashboard: 'Dashboard',
    hr_dashboard: 'Dashboard',
    logistics_dashboard: 'Logistics Dashboard',
    accounting_dashboard: 'Dashboard',
    products: 'Products',
    branches: 'Branches',
    leads: 'Leads',
    ai_leads: 'AI Leads',
    orders: 'Orders',
    customers: 'Customers',
    analytics: 'Analytics',
    sales_activity_log: 'Activity Log',
    reports: 'Reports',
    daily_performance: 'Daily Performance',
    staff_targets: 'Staff Targets',
    calling_leads: 'My Leads',
    calling_orders: 'My Orders',
    calling_reports: 'Reports',
    followup_queue: 'Follow-up Queue',
    leads_reports: 'Reports',
    stock_summary: 'Stock Summary',
    stock_movements: 'Stock Movements',
    inventory_activity_log: 'Activity Log',
    parties: 'Parties',
    warehouses: 'Warehouses',
    daily_pl: 'Daily P/L',
    transactions: 'Transactions',
    accounting_activity_log: 'Activity Log',
    accounts: 'Accounts',
    categories: 'Categories',
    party_statement: 'Party Statement',
    ads_spend: 'Ads Spend',
    influencer_list: 'Influencer List',
    campaigns: 'Campaigns',
    video_production: 'Video Production',
    content_calendar: 'Content Calendar',
    marketing_reports: 'Marketing Reports',
    product_daybook: 'Product Daybook',
    marketing_performance: 'Performance',
    employees: 'Employees',
    staff_documents: 'Documents',
    attendance_leave: 'Attendance & Leave',
    company_info: 'Company Info',
    notices: 'Notices',
    salary_payroll: 'Salary & Payroll',
    team_chat: 'Team Chat',
    knowledge_center: 'Knowledge Center',
    control_center: 'Control Center',
    ncm_analytics: 'NCM Analytics',
    gbl_analytics: 'GBL Analytics',
    pathao_analytics: 'Pathao Analytics',
    logistics_settings: 'Logistics Settings',
    logistics_orders: 'Orders',
    users: 'All Users',
    roles_permissions: 'Roles & Permissions',
    stores: 'Stores',
    task_management: 'Task Management',
    branding: 'Branding',
    backup: 'Backup',
    messaging: 'Messaging',
    settings: 'Settings',
    my_hr: 'My HR',
    my_documents: 'My Documents',
    my_attendance_leave: 'Attendance & Leave',
    my_tasks: 'My Tasks',
    my_training: 'My Training',
    my_courses: 'My Courses',
    certificates: 'Certificates',
  };
  return titleMap[moduleName] || moduleName;
}
