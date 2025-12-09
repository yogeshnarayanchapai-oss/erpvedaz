import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { SidebarBadge } from './SidebarBadge';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

type MenuItem = { title: string; url: string; icon: any; children?: MenuItem[] };

// Helper to prefix URLs with store slug
function prefixUrls(items: MenuItem[], storeSlug: string): MenuItem[] {
  return items.map(item => ({
    ...item,
    url: `/${storeSlug}${item.url}`,
    children: item.children ? prefixUrls(item.children, storeSlug) : undefined,
  }));
}

// Base menu items (without store prefix)
const getMyHRItems = (): MenuItem[] => [
  { title: 'My HR', url: '/my-hr', icon: Briefcase },
  { title: 'My Documents', url: '/my-hr/documents', icon: FileText },
  { title: 'My Attendance', url: '/my-hr/attendance', icon: Clock },
  { title: 'Leave Requests', url: '/my-hr/leave', icon: Calendar },
  { title: 'My Assets', url: '/my-hr/assets', icon: Box },
  { title: 'Holidays', url: '/my-hr/holidays', icon: Calendar },
  { title: 'Notices', url: '/my-hr/notices', icon: Bell },
  { title: 'Team Chat', url: '/my-hr/chat', icon: MessageSquare },
  { title: 'Salary Slips', url: '/my-hr/salary-slips', icon: Receipt },
];

const getMessagingItems = (): MenuItem[] => [
  { title: 'Channels', url: '/admin/messaging/channels', icon: Send },
  { title: 'Templates', url: '/admin/messaging/templates', icon: FileCode },
  { title: 'Automation Rules', url: '/admin/messaging/rules', icon: Settings2 },
  { title: 'Message Logs', url: '/admin/messaging/logs', icon: History },
];

const getLogisticsItems = (): MenuItem[] => [
  { title: 'Control Center', url: '/admin/logistics/control-center', icon: Truck },
  { title: 'Logistics Dashboard', url: '/admin/logistics-dashboard', icon: BarChart3 },
  { title: 'NCM Analytics', url: '/admin/logistics/ncm', icon: Package },
  { title: 'GBL Analytics', url: '/admin/logistics/gbl', icon: Package },
  { title: 'Pathao Analytics', url: '/admin/logistics/pathao', icon: Package },
  { title: 'Logistics Settings', url: '/admin/logistics-settings', icon: Settings2 },
];

const getMarketingItems = (): MenuItem[] => [
  { title: 'Ads Spend', url: '/admin/marketing/ads', icon: DollarSign },
  { title: 'Influencer List', url: '/admin/marketing/influencers', icon: Users },
  { title: 'Campaigns', url: '/admin/marketing/campaigns', icon: Megaphone },
  { title: 'Video Production', url: '/admin/marketing/video-projects', icon: FileText },
  { title: 'Content Calendar', url: '/admin/marketing/content-calendar', icon: Calendar },
  { title: 'Marketing Reports', url: '/admin/marketing/reports', icon: BarChart3 },
];

const getHrmItems = (): MenuItem[] => [
  { title: 'Employees', url: '/hrm/employees', icon: Users },
  { title: 'Staff Documents', url: '/hrm/staff-documents', icon: FileText },
  { title: 'Payroll', url: '/hrm/payroll', icon: DollarSign },
  { title: 'HR Policies', url: '/hrm/policies', icon: ScrollText },
  { title: 'Holidays & Events', url: '/hrm/holidays', icon: Calendar },
  { title: 'Leave Management', url: '/hrm/leave', icon: Clock },
  { title: 'Leave Quota', url: '/hrm/leave-quota', icon: ClipboardList },
  { title: 'Notice Board', url: '/hrm/notices', icon: Bell },
  { title: 'Team Structure', url: '/hrm/team-structure', icon: Network },
  { title: 'Company & Bank', url: '/hrm/company-info', icon: Building },
  { title: 'Salary Slips', url: '/hrm/salary-slips', icon: Receipt },
  { title: 'Assets', url: '/hrm/assets', icon: Box },
  { title: 'Attendance', url: '/hrm/attendance', icon: Clock },
  { title: 'Team Chat', url: '/hrm/chat', icon: MessageSquare },
];

const getKnowledgeCenterItems = (): MenuItem[] => [
  { title: 'Courses', url: '/hrm/knowledge-center', icon: BookOpen },
  { title: 'Reports', url: '/hrm/knowledge-center/reports', icon: BarChart3 },
];

const getMyTrainingItems = (): MenuItem[] => [
  { title: 'My Courses', url: '/training/my-courses', icon: BookOpen },
  { title: 'Certificates', url: '/training/certificates', icon: Award },
];

const getInventoryItems = (): MenuItem[] => [
  { title: 'Stock Summary', url: '/admin/inventory/stock-summary', icon: Package },
  { title: 'Stock Movements', url: '/admin/inventory/movements', icon: ArrowLeftRight },
  { title: 'Parties', url: '/admin/inventory/parties', icon: Users },
  { title: 'Warehouses', url: '/admin/inventory/warehouses', icon: Warehouse },
  { title: 'Daily P/L', url: '/admin/inventory/daily-pl', icon: Calculator },
];

const getAccountingItems = (): MenuItem[] => [
  { title: 'Dashboard', url: '/admin/accounting/dashboard-new', icon: LayoutDashboard },
  { title: 'New Deposit', url: '/admin/accounting/new-deposit', icon: DollarSign },
  { title: 'New Expense', url: '/admin/accounting/new-expense', icon: Receipt },
  { title: 'Transfer', url: '/admin/accounting/new-transfer', icon: ArrowLeftRight },
  { title: 'View Transactions', url: '/admin/accounting/transactions', icon: FileText },
  { title: 'Accounts', url: '/admin/accounting/accounts', icon: Wallet },
  { title: 'Receivables', url: '/admin/accounting/receivables', icon: TrendingUp },
  { title: 'Payables', url: '/admin/accounting/payables', icon: Receipt },
  { title: 'Party Statement', url: '/admin/accounting/party-statement', icon: FileText },
  { title: 'Audit Dashboard', url: '/admin/accounting/audit', icon: ClipboardList },
];

const getMenuItems = (role: AppRole): MenuItem[] => {
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
      { title: 'Products', url: '/admin/products', icon: Package },
      { title: 'Stores', url: '/admin/stores', icon: Store },
      { title: 'Branches', url: '/admin/branches', icon: Building2 },
      {
        title: 'Inventory',
        url: '/admin/inventory/stock-summary',
        icon: Warehouse,
        children: getInventoryItems(),
      },
      {
        title: 'Accounting',
        url: '/admin/accounting/dashboard-new',
        icon: Calculator,
        children: getAccountingItems(),
      },
      {
        title: 'Marketing',
        url: '/admin/marketing/ads',
        icon: Megaphone,
        children: getMarketingItems(),
      },
      { title: 'Leads', url: '/admin/leads', icon: Phone },
      { title: 'Orders', url: '/admin/orders', icon: ShoppingCart },
      { title: 'Customers', url: '/admin/customers', icon: Users },
      { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
      { 
        title: 'Reports', 
        url: '/admin/reports', 
        icon: FileText,
        children: [
          { title: 'All Reports', url: '/admin/reports', icon: FileText },
          { title: 'Daily Performance', url: '/admin/reports/daily-performance', icon: TrendingUp },
        ]
      },
      { title: 'Staff Targets', url: '/admin/staff-targets', icon: Target },
      { title: 'Notifications', url: '/admin/notifications', icon: Bell },
      { title: 'Branding', url: '/admin/branding', icon: Palette },
      { title: 'Data Tools', url: '/admin/data-tools', icon: Database },
      {
        title: 'Courier Integration',
        url: '/admin/logistics-dashboard',
        icon: Package,
        children: getLogisticsItems(),
      },
      {
        title: 'Messaging',
        url: '/admin/messaging/channels',
        icon: MessageSquare,
        children: getMessagingItems(),
      },
      {
        title: 'Knowledge Center',
        url: '/hrm/knowledge-center',
        icon: BookOpen,
        children: getKnowledgeCenterItems(),
      },
      {
        title: 'HRM',
        url: '/hrm/employees',
        icon: Briefcase,
        children: getHrmItems(),
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
      { title: 'Products', url: '/admin/products', icon: Package },
      { title: 'Branches', url: '/admin/branches', icon: Building2 },
      {
        title: 'Inventory',
        url: '/admin/inventory/stock-summary',
        icon: Warehouse,
        children: getInventoryItems(),
      },
      {
        title: 'Accounting',
        url: '/admin/accounting/dashboard-new',
        icon: Calculator,
        children: getAccountingItems(),
      },
      {
        title: 'Marketing',
        url: '/admin/marketing/ads',
        icon: Megaphone,
        children: getMarketingItems(),
      },
      { title: 'Leads', url: '/admin/leads', icon: Phone },
      { title: 'Orders', url: '/admin/orders', icon: ShoppingCart },
      { title: 'Customers', url: '/admin/customers', icon: Users },
      { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
      { 
        title: 'Reports', 
        url: '/admin/reports', 
        icon: FileText,
        children: [
          { title: 'All Reports', url: '/admin/reports', icon: FileText },
          { title: 'Daily Performance', url: '/admin/reports/daily-performance', icon: TrendingUp },
        ]
      },
      { title: 'Staff Targets', url: '/admin/staff-targets', icon: Target },
      { title: 'Notifications', url: '/admin/notifications', icon: Bell },
      { title: 'Branding', url: '/admin/branding', icon: Palette },
      { title: 'Data Tools', url: '/admin/data-tools', icon: Database },
      {
        title: 'Courier Integration',
        url: '/admin/logistics-dashboard',
        icon: Package,
        children: getLogisticsItems(),
      },
      {
        title: 'Messaging',
        url: '/admin/messaging/channels',
        icon: MessageSquare,
        children: getMessagingItems(),
      },
      {
        title: 'Knowledge Center',
        url: '/hrm/knowledge-center',
        icon: BookOpen,
        children: getKnowledgeCenterItems(),
      },
      {
        title: 'HRM',
        url: '/hrm/employees',
        icon: Briefcase,
        children: getHrmItems(),
      },
    ],
    HR: [
      { title: 'HR Dashboard', url: '/hr/dashboard', icon: LayoutDashboard },
      {
        title: 'Knowledge Center',
        url: '/hrm/knowledge-center',
        icon: BookOpen,
        children: getKnowledgeCenterItems(),
      },
      {
        title: 'HRM',
        url: '/hrm/employees',
        icon: Briefcase,
        children: getHrmItems(),
      },
    ],
    MANAGER: [
      { title: 'Dashboard', url: '/manager/dashboard', icon: LayoutDashboard },
      { title: 'Reports', url: '/manager/reports', icon: FileText },
      { title: 'Staff Targets', url: '/manager/targets', icon: Target },
      { title: 'Approvals', url: '/manager/approvals', icon: CheckSquare },
      {
        title: 'Knowledge Center',
        url: '/hrm/knowledge-center',
        icon: BookOpen,
        children: getKnowledgeCenterItems(),
      },
      {
        title: 'My Training',
        url: '/training/my-courses',
        icon: GraduationCap,
        children: getMyTrainingItems(),
      },
      {
        title: 'My HR',
        url: '/my-hr',
        icon: Briefcase,
        children: getMyHRItems(),
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
        children: getMyTrainingItems(),
      },
      {
        title: 'My HR',
        url: '/my-hr',
        icon: Briefcase,
        children: getMyHRItems(),
      },
    ],
    LEADS: [
      { title: 'Dashboard', url: '/leads/dashboard', icon: LayoutDashboard },
      { title: 'Leads', url: '/leads/all', icon: Phone },
      { title: 'Follow-up Queue', url: '/leads/followup', icon: UserCheck },
      { title: 'Reports', url: '/leads/reports', icon: FileText },
      {
        title: 'My Training',
        url: '/training/my-courses',
        icon: GraduationCap,
        children: getMyTrainingItems(),
      },
      {
        title: 'My HR',
        url: '/my-hr',
        icon: Briefcase,
        children: getMyHRItems(),
      },
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
        children: getMyTrainingItems(),
      },
      {
        title: 'My HR',
        url: '/my-hr',
        icon: Briefcase,
        children: getMyHRItems(),
      },
    ],
    FOLLOWUP: [
      { title: 'Dashboard', url: '/logistics-portal/dashboard', icon: LayoutDashboard },
      { title: 'Orders', url: '/logistics-portal/orders', icon: Truck },
      {
        title: 'My Training',
        url: '/training/my-courses',
        icon: GraduationCap,
        children: getMyTrainingItems(),
      },
      {
        title: 'My HR',
        url: '/my-hr',
        icon: Briefcase,
        children: getMyHRItems(),
      },
    ],
    LOGISTICS: [
      { title: 'Dashboard', url: '/logistics-portal/dashboard', icon: LayoutDashboard },
      { title: 'Orders', url: '/logistics-portal/orders', icon: Truck },
      {
        title: 'My Training',
        url: '/training/my-courses',
        icon: GraduationCap,
        children: getMyTrainingItems(),
      },
      {
        title: 'My HR',
        url: '/my-hr',
        icon: Briefcase,
        children: getMyHRItems(),
      },
    ],
    ACCOUNTANT: [
      { title: 'Dashboard', url: '/admin/accounting/dashboard-new', icon: LayoutDashboard },
      { title: 'Accounting', url: '/admin/accounting/dashboard-new', icon: Calculator, children: getAccountingItems() },
      { title: 'Inventory', url: '/admin/inventory/stock-summary', icon: Warehouse, children: getInventoryItems() },
      { title: 'My Training', url: '/training/my-courses', icon: GraduationCap, children: getMyTrainingItems() },
      { title: 'My HR', url: '/my-hr', icon: Briefcase, children: getMyHRItems() },
    ],
    WAREHOUSE: [
      { title: 'Dashboard', url: '/admin/inventory/stock-summary', icon: LayoutDashboard },
      { title: 'Inventory', url: '/admin/inventory/stock-summary', icon: Warehouse, children: getInventoryItems() },
      { title: 'Products', url: '/admin/products', icon: Package },
      { title: 'My Training', url: '/training/my-courses', icon: GraduationCap, children: getMyTrainingItems() },
      { title: 'My HR', url: '/my-hr', icon: Briefcase, children: getMyHRItems() },
    ],
  };

  return menuItems[role] || menuItems.CALLING;
};

interface StoreSidebarProps {
  storeSlug: string;
  storeName: string;
}

export function StoreSidebar({ storeSlug, storeName }: StoreSidebarProps) {
  const { profile, signOut } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const location = useLocation();
  const { data: badges } = useSidebarBadges();
  const role = effectiveRole;
  
  // Get base menu items and prefix with store slug
  const baseItems = getMenuItems(role);
  const items = prefixUrls(baseItems, storeSlug);
  
  const isChildActive = (item: MenuItem) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.url || location.pathname.startsWith(child.url + '/'));
  };

  const isActive = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach(item => {
      if (item.children && isChildActive(item)) {
        initial[item.title] = true;
      }
    });
    return initial;
  });

  // Get badge count for a menu item
  const getBadgeCount = (title: string): number => {
    if (!badges) return 0;
    const titleLower = title.toLowerCase();
    if (titleLower.includes('order')) return badges.orders;
    if (titleLower.includes('lead') && !titleLower.includes('followup')) return badges.leads;
    if (titleLower.includes('notification')) return badges.notifications;
    if (titleLower.includes('leave') && (role === 'ADMIN' || role === 'HR' || role === 'MANAGER')) return badges.leaveRequests;
    if (titleLower.includes('inventory') || titleLower.includes('stock summary')) return badges.lowStock;
    return 0;
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground text-sm truncate max-w-[140px]">
              {storeName || 'Store'}
            </h2>
            <p className="text-xs text-sidebar-muted capitalize">{role.toLowerCase()} portal</p>
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
                    open={openMenus[item.title]}
                    onOpenChange={(open) => setOpenMenus(prev => ({ ...prev, [item.title]: open }))}
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
                          <ChevronDown className={`w-4 h-4 transition-transform ${openMenus[item.title] ? 'rotate-180' : ''}`} />
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
                                <Link
                                  to={child.url}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm ${
                                    isActive(child.url) ? 'bg-sidebar-accent text-sidebar-foreground font-medium' : ''
                                  }`}
                                >
                                  <child.icon className="w-4 h-4" />
                                  <span className="flex-1">{child.title}</span>
                                  <SidebarBadge count={childBadge} />
                                </Link>
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
                      <Link
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${
                          isActive(item.url) ? 'bg-sidebar-accent text-sidebar-foreground font-medium' : ''
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm flex-1">{item.title}</span>
                        <SidebarBadge count={badgeCount} />
                      </Link>
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
