import {
  LayoutDashboard,
  Users,
  Phone,
  UserCheck,
  Package,
  ShoppingCart,
  Megaphone,
  FileText,
  Building2,
  Shield,
  Target,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  Bell,
  Building,
  Receipt,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  CheckSquare,
  BarChart3,
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
  type LucideIcon,
} from 'lucide-react';

export interface ModuleRegistryEntry {
  url: string;
  icon: LucideIcon;
  category: string;
  parentModule?: string; // for grouping as submenu under a parent
}

/**
 * Master registry mapping system_module.name -> URL, icon, category.
 * Used to build dynamic sidebar from database permissions.
 */
export const MODULE_REGISTRY: Record<string, ModuleRegistryEntry> = {
  // Dashboard
  admin_dashboard: { url: '/admin/dashboard', icon: LayoutDashboard, category: 'Dashboard' },
  sales_dashboard: { url: '/admin/sales/dashboard', icon: TrendingUp, category: 'Dashboard' },
  calling_dashboard: { url: '/calling/dashboard', icon: LayoutDashboard, category: 'Dashboard' },
  leads_dashboard: { url: '/leads/dashboard', icon: LayoutDashboard, category: 'Dashboard' },
  marketing_dashboard: { url: '/marketing/dashboard', icon: LayoutDashboard, category: 'Dashboard' },
  hr_dashboard: { url: '/hr/dashboard', icon: LayoutDashboard, category: 'Dashboard' },
  logistics_dashboard: { url: '/admin/logistics-dashboard', icon: BarChart3, category: 'Dashboard' },
  accounting_dashboard: { url: '/admin/accounting/dashboard-new', icon: LayoutDashboard, category: 'Dashboard' },

  // Sales
  products: { url: '/admin/products', icon: Package, category: 'Sales' },
  branches: { url: '/admin/branches', icon: Building2, category: 'Sales' },
  leads: { url: '/admin/leads', icon: Phone, category: 'Sales' },
  ai_leads: { url: '/admin/ai-leads', icon: Brain, category: 'Sales' },
  orders: { url: '/admin/orders', icon: ShoppingCart, category: 'Sales' },
  customers: { url: '/admin/customers', icon: Users, category: 'Sales' },
  analytics: { url: '/admin/analytics', icon: BarChart3, category: 'Sales' },
  sales_activity_log: { url: '/admin/sales/activity-log', icon: History, category: 'Sales' },
  reports: { url: '/admin/reports', icon: FileText, category: 'Sales' },
  daily_performance: { url: '/admin/reports/daily-performance', icon: TrendingUp, category: 'Sales' },
  staff_targets: { url: '/admin/staff-targets', icon: Target, category: 'Sales' },
  calling_leads: { url: '/calling/leads', icon: Phone, category: 'Sales' },
  calling_orders: { url: '/calling/orders', icon: ShoppingCart, category: 'Sales' },
  calling_reports: { url: '/calling/reports', icon: FileText, category: 'Sales' },
  followup_queue: { url: '/leads/followup', icon: UserCheck, category: 'Sales' },
  leads_reports: { url: '/leads/reports', icon: FileText, category: 'Sales' },

  // Inventory
  stock_summary: { url: '/admin/inventory/stock-summary', icon: Package, category: 'Inventory' },
  stock_movements: { url: '/admin/inventory/movements', icon: ArrowLeftRight, category: 'Inventory' },
  inventory_activity_log: { url: '/admin/inventory/activity-log', icon: History, category: 'Inventory' },
  parties: { url: '/admin/inventory/parties', icon: Users, category: 'Inventory' },
  warehouses: { url: '/admin/inventory/warehouses', icon: Warehouse, category: 'Inventory' },
  daily_pl: { url: '/admin/inventory/daily-pl', icon: Calculator, category: 'Inventory' },

  // Accounting
  transactions: { url: '/admin/accounting/transactions', icon: FileText, category: 'Accounting' },
  accounting_activity_log: { url: '/admin/accounting/activity-log', icon: History, category: 'Accounting' },
  accounts: { url: '/admin/accounting/accounts', icon: Wallet, category: 'Accounting' },
  categories: { url: '/admin/accounting/categories', icon: ClipboardList, category: 'Accounting' },
  party_statement: { url: '/admin/accounting/party-statement', icon: FileText, category: 'Accounting' },

  // Marketing
  ads_spend: { url: '/admin/marketing/ads', icon: DollarSign, category: 'Marketing' },
  influencer_list: { url: '/admin/marketing/influencers', icon: Users, category: 'Marketing' },
  campaigns: { url: '/admin/marketing/campaigns', icon: Megaphone, category: 'Marketing' },
  video_production: { url: '/admin/marketing/video-projects', icon: FileText, category: 'Marketing' },
  content_calendar: { url: '/admin/marketing/content-calendar', icon: Calendar, category: 'Marketing' },
  marketing_reports: { url: '/admin/marketing/reports', icon: BarChart3, category: 'Marketing' },
  product_daybook: { url: '/marketing/daybook', icon: BarChart3, category: 'Marketing' },
  marketing_performance: { url: '/marketing/performance', icon: TrendingUp, category: 'Marketing' },

  // HRM
  employees: { url: '/hrm/employees', icon: Users, category: 'HRM' },
  staff_documents: { url: '/hrm/staff-documents', icon: FileText, category: 'HRM' },
  attendance_leave: { url: '/hrm/attendance-leave', icon: Clock, category: 'HRM' },
  company_info: { url: '/hrm/company-info', icon: Building, category: 'HRM' },
  notices: { url: '/hrm/notices', icon: Bell, category: 'HRM' },
  salary_payroll: { url: '/hrm/salary-payroll', icon: DollarSign, category: 'HRM' },
  team_chat: { url: '/hrm/chat', icon: MessageSquare, category: 'HRM' },
  knowledge_center: { url: '/hrm/knowledge-center', icon: BookOpen, category: 'HRM' },

  // Logistics
  control_center: { url: '/admin/logistics/control-center', icon: Truck, category: 'Logistics' },
  ncm_analytics: { url: '/admin/logistics/ncm', icon: Package, category: 'Logistics' },
  gbl_analytics: { url: '/admin/logistics/gbl', icon: Package, category: 'Logistics' },
  pathao_analytics: { url: '/admin/logistics/pathao', icon: Package, category: 'Logistics' },
  logistics_settings: { url: '/admin/logistics-settings', icon: Settings2, category: 'Logistics' },
  logistics_orders: { url: '/logistics/orders', icon: Truck, category: 'Logistics' },

  // Admin
  users: { url: '/admin/users', icon: Users, category: 'Admin' },
  roles_permissions: { url: '/admin/roles-permissions', icon: Shield, category: 'Admin' },
  stores: { url: '/admin/stores', icon: Store, category: 'Admin' },
  task_management: { url: '/hrm/tasks', icon: CheckSquare, category: 'Admin' },
  branding: { url: '/admin/branding', icon: Palette, category: 'Admin' },
  backup: { url: '/admin/data-tools', icon: HardDrive, category: 'Admin' },
  messaging: { url: '/admin/messaging/channels', icon: MessageSquare, category: 'Admin' },
  settings: { url: '/admin/settings', icon: Settings2, category: 'Admin' },

  // Staff Self-Service
  my_hr: { url: '/my-hr', icon: Briefcase, category: 'Staff Self-Service' },
  my_documents: { url: '/my-hr/documents', icon: FileText, category: 'Staff Self-Service' },
  my_attendance_leave: { url: '/my-hr/attendance-leave', icon: Clock, category: 'Staff Self-Service' },
  my_tasks: { url: '/my-tasks', icon: CheckSquare, category: 'Staff Self-Service' },
  my_training: { url: '/training/my-courses', icon: GraduationCap, category: 'Staff Self-Service' },
  my_courses: { url: '/training/my-courses', icon: BookOpen, category: 'Staff Self-Service' },
  certificates: { url: '/training/certificates', icon: Award, category: 'Staff Self-Service' },
};

/**
 * Defines how modules are grouped in the sidebar.
 * Each group has a label and the module names that appear under it.
 * Modules with children become collapsible submenus.
 */
export interface SidebarGroupDef {
  label: string;
  icon: LucideIcon;
  modules: string[]; // module names from MODULE_REGISTRY
}

/**
 * Sidebar structure definition - maps categories to their grouping.
 * This controls the visual grouping in the sidebar (collapsible parents with children).
 */
export const SIDEBAR_GROUPS: SidebarGroupDef[] = [
  {
    label: 'Sales',
    icon: TrendingUp,
    modules: ['sales_dashboard', 'products', 'branches', 'leads', 'ai_leads', 'orders', 'customers', 'analytics', 'sales_activity_log', 'reports', 'daily_performance', 'staff_targets'],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    modules: ['stock_summary', 'stock_movements', 'inventory_activity_log', 'parties', 'warehouses', 'daily_pl'],
  },
  {
    label: 'Accounting',
    icon: Calculator,
    modules: ['accounting_dashboard', 'transactions', 'accounting_activity_log', 'accounts', 'categories', 'party_statement'],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    modules: ['ads_spend', 'influencer_list', 'campaigns', 'video_production', 'content_calendar', 'marketing_reports', 'product_daybook', 'marketing_performance'],
  },
  {
    label: 'HRM',
    icon: Briefcase,
    modules: ['hr_dashboard', 'employees', 'staff_documents', 'attendance_leave', 'company_info', 'notices', 'salary_payroll', 'team_chat'],
  },
  {
    label: 'Logistics',
    icon: Truck,
    modules: ['control_center', 'logistics_dashboard', 'ncm_analytics', 'gbl_analytics', 'pathao_analytics', 'logistics_settings', 'logistics_orders'],
  },
  {
    label: 'Knowledge Center',
    icon: BookOpen,
    modules: ['knowledge_center'],
  },
  {
    label: 'Messaging',
    icon: MessageSquare,
    modules: ['messaging'],
  },
  {
    label: 'My HR',
    icon: Briefcase,
    modules: ['my_hr', 'my_documents', 'my_attendance_leave', 'company_info', 'team_chat', 'notices'],
  },
  {
    label: 'My Training',
    icon: GraduationCap,
    modules: ['my_courses', 'certificates'],
  },
];

/**
 * Standalone items that appear at the top level (not grouped).
 */
export const STANDALONE_MODULES = [
  'admin_dashboard',
  'calling_dashboard',
  'leads_dashboard',
  'marketing_dashboard',
  'hr_dashboard',
  'users',
  'roles_permissions',
  'stores',
  'task_management',
  'branding',
  'backup',
  'settings',
  'my_tasks',
  'calling_leads',
  'calling_orders',
  'calling_reports',
  'followup_queue',
  'leads_reports',
  'logistics_orders',
];
