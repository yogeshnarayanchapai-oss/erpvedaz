import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { NavLink } from '@/components/NavLink';
import { getRoleDisplayLabel } from '@/lib/roleUtils';
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
import {
  LayoutDashboard,
  Users,
  Phone,
  UserCheck,
  Package,
  ShoppingCart,
  LogOut,
  Zap,
  Megaphone,
  FileText,
  MapPin,
  Globe,
  ChevronDown,
  Building2,
  Shield,
  Target,
  Briefcase,
  DollarSign,
  ScrollText,
  Calendar,
  Clock,
  Bell,
  Network,
  Building,
  Receipt,
  Box,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  CheckSquare,
  BarChart3,
  Database,
  Palette,
  Send,
  FileCode,
  Settings2,
  History,
  BookOpen,
  GraduationCap,
  Award,
  Warehouse,
  ArrowLeftRight,
  Calculator,
  Wallet,
  Truck,
  Store,
  Brain,
  HardDrive,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { SidebarBadge } from './SidebarBadge';
import { useBranding } from '@/hooks/useBranding';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

type MenuItem = { title: string; url: string; icon: any; children?: MenuItem[] };

// My HR menu items for all staff (simplified structure)
const myHRItems: MenuItem[] = [
  { title: 'My HR', url: '/my-hr', icon: Briefcase },
  { title: 'My Documents', url: '/my-hr/documents', icon: FileText },
  { title: 'Attendance & Leave', url: '/my-hr/attendance-leave', icon: Clock },
  { title: 'Company Info', url: '/my-hr/company-info', icon: Building },
  { title: 'Team Chat', url: '/my-hr/chat', icon: MessageSquare },
  { title: 'Notices', url: '/my-hr/notices', icon: Bell },
];

// Messaging submenu for Admin
const messagingItems: MenuItem[] = [
  { title: 'Channels', url: '/admin/messaging/channels', icon: Send },
  { title: 'Templates', url: '/admin/messaging/templates', icon: FileCode },
  { title: 'Automation Rules', url: '/admin/messaging/rules', icon: Settings2 },
  { title: 'Message Logs', url: '/admin/messaging/logs', icon: History },
];

// Logistics submenu for Admin
const logisticsItems: MenuItem[] = [
  { title: 'Control Center', url: '/admin/logistics/control-center', icon: Truck },
  { title: 'Logistics Dashboard', url: '/admin/logistics-dashboard', icon: BarChart3 },
  { title: 'NCM Analytics', url: '/admin/logistics/ncm', icon: Package },
  { title: 'GBL Analytics', url: '/admin/logistics/gbl', icon: Package },
  { title: 'Pathao Analytics', url: '/admin/logistics/pathao', icon: Package },
  { title: 'Logistics Settings', url: '/admin/logistics-settings', icon: Settings2 },
];

// Marketing submenu for Admin
const marketingItems: MenuItem[] = [
  { title: 'Ads Spend', url: '/admin/marketing/ads', icon: DollarSign },
  { title: 'Influencer List', url: '/admin/marketing/influencers', icon: Users },
  { title: 'Campaigns', url: '/admin/marketing/campaigns', icon: Megaphone },
  { title: 'Video Production', url: '/admin/marketing/video-projects', icon: FileText },
  { title: 'Content Calendar', url: '/admin/marketing/content-calendar', icon: Calendar },
  { title: 'Marketing Reports', url: '/admin/marketing/reports', icon: BarChart3 },
];

// HRM submenu for HR role (merged structure)
const hrmItems: MenuItem[] = [
  { title: 'Dashboard', url: '/hrm', icon: LayoutDashboard },
  { title: 'Employees', url: '/hrm/employees', icon: Users },
  { title: 'Documents', url: '/hrm/staff-documents', icon: FileText },
  { title: 'Attendance & Leave', url: '/hrm/attendance-leave', icon: Clock },
  { title: 'Company Info', url: '/hrm/company-info', icon: Building },
  { title: 'Notices', url: '/hrm/notices', icon: Bell },
  { title: 'Salary & Payroll', url: '/hrm/salary-payroll', icon: DollarSign },
  { title: 'Team Chat', url: '/hrm/chat', icon: MessageSquare },
];

// Other submenu for Admin (Branding, Messaging, Knowledge Center) - NO Backup here, it's OWNER only
const otherItems: MenuItem[] = [
  { title: 'Branding', url: '/admin/branding', icon: Palette },
  {
    title: 'Messaging',
    url: '/admin/messaging/channels',
    icon: MessageSquare,
    children: [
      { title: 'Channels', url: '/admin/messaging/channels', icon: Send },
      { title: 'Templates', url: '/admin/messaging/templates', icon: FileCode },
      { title: 'Automation Rules', url: '/admin/messaging/rules', icon: Settings2 },
      { title: 'Message Logs', url: '/admin/messaging/logs', icon: History },
    ],
  },
  {
    title: 'Knowledge Center',
    url: '/hrm/knowledge-center',
    icon: BookOpen,
    children: [
      { title: 'Courses', url: '/hrm/knowledge-center', icon: BookOpen },
      { title: 'Reports', url: '/hrm/knowledge-center/reports', icon: BarChart3 },
    ],
  },
];

// Other submenu for OWNER only (includes Backup)
const ownerOtherItems: MenuItem[] = [
  { title: 'Branding', url: '/admin/branding', icon: Palette },
  { title: 'Backup', url: '/admin/data-tools', icon: HardDrive },
  {
    title: 'Messaging',
    url: '/admin/messaging/channels',
    icon: MessageSquare,
    children: [
      { title: 'Channels', url: '/admin/messaging/channels', icon: Send },
      { title: 'Templates', url: '/admin/messaging/templates', icon: FileCode },
      { title: 'Automation Rules', url: '/admin/messaging/rules', icon: Settings2 },
      { title: 'Message Logs', url: '/admin/messaging/logs', icon: History },
    ],
  },
  {
    title: 'Knowledge Center',
    url: '/hrm/knowledge-center',
    icon: BookOpen,
    children: [
      { title: 'Courses', url: '/hrm/knowledge-center', icon: BookOpen },
      { title: 'Reports', url: '/hrm/knowledge-center/reports', icon: BarChart3 },
    ],
  },
];

// Knowledge Center submenu for Admin
const knowledgeCenterItems: MenuItem[] = [
  { title: 'Courses', url: '/hrm/knowledge-center', icon: BookOpen },
  { title: 'Reports', url: '/hrm/knowledge-center/reports', icon: BarChart3 },
];

// My Training submenu for all staff
const myTrainingItems: MenuItem[] = [
  { title: 'My Courses', url: '/training/my-courses', icon: BookOpen },
  { title: 'Certificates', url: '/training/certificates', icon: Award },
];

// Inventory submenu for Admin
const inventoryItems: MenuItem[] = [
  { title: 'Stock Summary', url: '/admin/inventory/stock-summary', icon: Package },
  { title: 'Stock Movements', url: '/admin/inventory/movements', icon: ArrowLeftRight },
  { title: 'Activity Log', url: '/admin/inventory/activity-log', icon: History },
  { title: 'Parties', url: '/admin/inventory/parties', icon: Users },
  { title: 'Warehouses', url: '/admin/inventory/warehouses', icon: Warehouse },
  { title: 'Daily P/L', url: '/admin/inventory/daily-pl', icon: Calculator },
];

// Accounting submenu for Admin
const accountingItems: MenuItem[] = [
  { title: 'Dashboard', url: '/admin/accounting/dashboard-new', icon: LayoutDashboard },
  { title: 'Transactions', url: '/admin/accounting/transactions', icon: FileText },
  { title: 'Activity Log', url: '/admin/accounting/activity-log', icon: History },
  { title: 'Accounts', url: '/admin/accounting/accounts', icon: Wallet },
  { title: 'Categories', url: '/admin/accounting/categories', icon: ClipboardList },
  { title: 'Party Statement', url: '/admin/accounting/party-statement', icon: FileText },
];

// Sales submenu for Admin/Owner
const salesItems: MenuItem[] = [
  { title: 'Sales Dashboard', url: '/admin/sales/dashboard', icon: TrendingUp },
  { title: 'Products', url: '/admin/products', icon: Package },
  { title: 'Branches', url: '/admin/branches', icon: Building2 },
  { title: 'Leads', url: '/admin/leads', icon: Phone },
  { title: 'AI Leads', url: '/admin/ai-leads', icon: Brain },
  { title: 'Orders', url: '/admin/orders', icon: ShoppingCart },
  { title: 'Customers', url: '/admin/customers', icon: Users },
  { title: 'Activity Log', url: '/admin/sales/activity-log', icon: History },
  { title: 'Reports', url: '/admin/reports', icon: FileText },
  { title: 'Staff Targets', url: '/admin/staff-targets', icon: Target },
  {
    title: 'Courier Integration',
    url: '/admin/logistics-dashboard',
    icon: Truck,
    children: logisticsItems,
  },
];

const menuItems: Record<AppRole, MenuItem[]> = {
  OWNER: [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
    { 
      title: 'Users', 
      url: '/admin/users', 
      icon: Users,
      children: [
        { title: 'All Users', url: '/admin/users', icon: Users },
        { title: 'Roles & Permissions', url: '/admin/roles-permissions', icon: Shield },
      ]
    },
    { title: 'Stores', url: '/admin/stores', icon: Store },
    {
      title: 'Sales',
      url: '/admin/products',
      icon: TrendingUp,
      children: salesItems,
    },
    { title: 'Task Management', url: '/hrm/tasks', icon: CheckSquare },
    {
      title: 'Inventory',
      url: '/admin/inventory/stock-summary',
      icon: Warehouse,
      children: inventoryItems,
    },
    {
      title: 'Accounting',
      url: '/admin/accounting/dashboard-new',
      icon: Calculator,
      children: accountingItems,
    },
    {
      title: 'Marketing',
      url: '/admin/marketing/ads',
      icon: Megaphone,
      children: marketingItems,
    },
    {
      title: 'HRM',
      url: '/hrm/employees',
      icon: Briefcase,
      children: hrmItems,
    },
  ],
  ADMIN: [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
    { 
      title: 'Users', 
      url: '/admin/users', 
      icon: Users,
      children: [
        { title: 'All Users', url: '/admin/users', icon: Users },
        { title: 'Roles & Permissions', url: '/admin/roles-permissions', icon: Shield },
      ]
    },
    {
      title: 'Sales',
      url: '/admin/products',
      icon: TrendingUp,
      children: salesItems,
    },
    { title: 'Task Management', url: '/hrm/tasks', icon: CheckSquare },
    {
      title: 'Inventory',
      url: '/admin/inventory/stock-summary',
      icon: Warehouse,
      children: inventoryItems,
    },
    {
      title: 'Accounting',
      url: '/admin/accounting/dashboard-new',
      icon: Calculator,
      children: accountingItems,
    },
    {
      title: 'Marketing',
      url: '/admin/marketing/ads',
      icon: Megaphone,
      children: marketingItems,
    },
    {
      title: 'HRM',
      url: '/hrm/employees',
      icon: Briefcase,
      children: hrmItems,
    },
  ],
  HR: [
    { title: 'HR Dashboard', url: '/hr/dashboard', icon: LayoutDashboard },
    {
      title: 'Knowledge Center',
      url: '/hrm/knowledge-center',
      icon: BookOpen,
      children: knowledgeCenterItems,
    },
    {
      title: 'HRM',
      url: '/hrm/employees',
      icon: Briefcase,
      children: hrmItems,
    },
  ],
  MANAGER: [
    { title: 'Dashboard', url: '/admin/sales/dashboard', icon: LayoutDashboard },
    {
      title: 'Sales',
      url: '/admin/products',
      icon: TrendingUp,
      children: salesItems,
    },
    { title: 'Task Management', url: '/hrm/tasks', icon: CheckSquare },
    {
      title: 'Inventory',
      url: '/admin/inventory/stock-summary',
      icon: Warehouse,
      children: inventoryItems,
    },
    {
      title: 'Accounting',
      url: '/admin/accounting/dashboard-new',
      icon: Calculator,
      children: accountingItems,
    },
    {
      title: 'Marketing',
      url: '/admin/marketing/ads',
      icon: Megaphone,
      children: marketingItems,
    },
    {
      title: 'Knowledge Center',
      url: '/hrm/knowledge-center',
      icon: BookOpen,
      children: knowledgeCenterItems,
    },
    {
      title: 'HRM',
      url: '/hrm/employees',
      icon: Briefcase,
      children: hrmItems,
    },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
  ],
  MARKETING: [
    { title: 'Dashboard', url: '/marketing/dashboard', icon: LayoutDashboard },
    { title: 'Ads Spend', url: '/marketing/ads', icon: Megaphone },
    { title: 'Product Daybook', url: '/marketing/daybook', icon: BarChart3 },
    { title: 'Performance', url: '/marketing/performance', icon: TrendingUp },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
  LEADS: [
    { title: 'Dashboard', url: '/leads/dashboard', icon: LayoutDashboard },
    { title: 'Leads', url: '/leads/all', icon: Phone },
    { title: 'AI Leads', url: '/admin/ai-leads', icon: Brain },
    { title: 'Follow-up Queue', url: '/leads/followup', icon: UserCheck },
    { title: 'Reports', url: '/leads/reports', icon: FileText },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
  CALLING: [
    { title: 'Dashboard', url: '/calling/dashboard', icon: LayoutDashboard },
    { title: 'My Leads', url: '/calling/leads', icon: Phone },
    { title: 'My Orders', url: '/calling/orders', icon: ShoppingCart },
    { title: 'Reports', url: '/calling/reports', icon: FileText },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
  // FOLLOWUP role now uses LOGISTICS portal menu
  FOLLOWUP: [
    { title: 'Dashboard', url: '/logistics/dashboard', icon: LayoutDashboard },
    { title: 'Orders', url: '/logistics/orders', icon: Truck },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
  LOGISTICS: [
    { title: 'Dashboard', url: '/logistics/dashboard', icon: LayoutDashboard },
    { title: 'Orders', url: '/logistics/orders', icon: Truck },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
  ACCOUNTANT: [
    { title: 'Dashboard', url: '/admin/accounting/dashboard-new', icon: LayoutDashboard },
    {
      title: 'Accounting',
      url: '/admin/accounting/dashboard-new',
      icon: Calculator,
      children: accountingItems,
    },
    { title: 'Daily P/L', url: '/admin/inventory/daily-pl', icon: TrendingUp },
    { title: 'Salary & Payroll', url: '/hrm/salary-payroll', icon: DollarSign },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
  WAREHOUSE: [
    { title: 'Dashboard', url: '/admin/inventory/stock-summary', icon: LayoutDashboard },
    {
      title: 'Inventory',
      url: '/admin/inventory/stock-summary',
      icon: Warehouse,
      children: inventoryItems,
    },
    { title: 'Products', url: '/admin/products', icon: Package },
    {
      title: 'My Training',
      url: '/training/my-courses',
      icon: GraduationCap,
      children: myTrainingItems,
    },
    {
      title: 'My HR',
      url: '/my-hr',
      icon: Briefcase,
      children: myHRItems,
    },
    { title: 'My Tasks', url: '/my-tasks', icon: CheckSquare },
  ],
};

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const location = useLocation();
  const { data: badges } = useSidebarBadges();
  const { branding } = useBranding();
  const role = effectiveRole;
  const items = menuItems[role] || menuItems.CALLING;
  
  const isChildActive = (item: MenuItem) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.url);
  };
  
  // Single-open accordion state: only one parent menu expanded at a time
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    // Initialize with the menu that has an active child
    for (const item of items) {
      if (item.children && isChildActive(item)) {
        return item.title;
      }
    }
    return null;
  });

  // Handle accordion toggle - close others when opening a new one
  const handleMenuToggle = (menuTitle: string, isOpen: boolean) => {
    setExpandedMenu(isOpen ? menuTitle : null);
  };

  // Get badge count for a menu item
  const getBadgeCount = (title: string): number => {
    if (!badges) return 0;
    const titleLower = title.toLowerCase();
    
    // Team Chat badge: show unread messages count
    if (titleLower === 'team chat') return badges.teamChat;
    
    // My Tasks: show Pending + In Progress count
    if (titleLower === 'my tasks') return badges.myTasks;
    
    // Task Management for ADMIN/OWNER/MANAGER: show their pending tasks
    if (titleLower === 'task management' && ['ADMIN', 'OWNER', 'MANAGER'].includes(role)) return badges.myTasks;
    
    // My HR for staff: show only admin action notifications + team chat
    const isStaffRole = !['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(role);
    if (titleLower === 'my hr' && isStaffRole) return badges.myHR + badges.teamChat;
    
    // My Orders for staff: NO badge
    if (titleLower === 'my orders' && isStaffRole) return 0;
    
    // My Leads for CALLING: only NEW leads (handled in useSidebarBadges)
    if (titleLower.includes('lead') && !titleLower.includes('followup')) return badges.leads;
    
    // Admin/Manager badges
    if (titleLower.includes('order')) return badges.orders;
    if (titleLower.includes('notification')) return badges.notifications;
    if (titleLower.includes('leave') && (role === 'ADMIN' || role === 'HR' || role === 'MANAGER' || role === 'OWNER')) return badges.leaveRequests;
    // HRM parent menu: show leave requests + pending documents + team chat for admins/owners
    if (titleLower === 'hrm' && (role === 'ADMIN' || role === 'HR' || role === 'MANAGER' || role === 'OWNER')) return badges.leaveRequests + badges.pendingDocuments + badges.teamChat;
    // Inventory parent menu: show high alert count for admins/owners
    if (titleLower === 'inventory' && (role === 'ADMIN' || role === 'MANAGER' || role === 'OWNER')) return badges.highAlert;
    
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
