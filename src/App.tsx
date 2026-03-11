import { lazy, Suspense } from 'react';
import '@/lib/storageCleanup'; // Auto-cleanup on app startup

const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DateModeProvider } from "@/contexts/DateModeContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from 'lucide-react';
import { DynamicBranding } from "@/components/DynamicBranding";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";
import InstallApp from "./pages/InstallApp";

import AdminUnifiedDashboard from "./pages/admin/AdminUnifiedDashboard";
import AdminSalesDashboard from "./pages/admin/AdminSalesDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import RolesPermissions from "./pages/admin/RolesPermissions";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminAds from "./pages/admin/AdminAds";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminOrders from './pages/admin/AdminOrders';
import OrderDetail from './pages/admin/OrderDetail';
import AdminCustomers from './pages/admin/AdminCustomers';
import CustomerDetail from './pages/admin/CustomerDetail';
import ReportsHub from "./pages/admin/ReportsHub";
import AdminReports from "./pages/admin/AdminReports";
import DailyPerformance from "./pages/admin/reports/DailyPerformance";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import BusinessControlReport from "./pages/admin/reports/BusinessControlReport";
import ProfitLossReport from "./pages/admin/reports/ProfitLossReport";
import SalesReport from "./pages/admin/reports/SalesReport";
import IncomeExpenseReport from "./pages/admin/reports/IncomeExpenseReport";
import DayBookReport from "./pages/admin/reports/DayBookReport";
import BankPartyReport from "./pages/admin/reports/BankPartyReport";
import BusinessStatusReport from "./pages/admin/reports/BusinessStatusReport";
import ProductReport from "./pages/admin/reports/ProductReport";
import LeadsReportAdmin from "./pages/admin/reports/LeadsReport";
import CallingReportAdmin from "./pages/admin/reports/CallingReport";
import LogisticsReport from "./pages/admin/reports/LogisticsReport";
import SourceAnalysisReport from "./pages/admin/reports/SourceAnalysisReport";
import AiSummaryReport from "./pages/admin/reports/AiSummaryReport";
import AdminStaffTargets from "./pages/admin/AdminStaffTargets";
import AdminNotifications from "./pages/admin/AdminNotifications";
import SalesActivityLog from "./pages/admin/SalesActivityLog";
import AdminDataTools from "./pages/admin/AdminDataTools";
import SalesSettings from "./pages/admin/SalesSettings";
import AdminBranding from "./pages/admin/AdminBranding";
import AdminSettings from "./pages/admin/AdminSettings";
import Stores from "./pages/admin/Stores";
import StoreDetail from "./pages/admin/StoreDetail";

// Admin Messaging pages
import AdminMessagingChannels from "./pages/admin/messaging/AdminMessagingChannels";
import AdminMessagingTemplates from "./pages/admin/messaging/AdminMessagingTemplates";
import AdminMessagingRules from "./pages/admin/messaging/AdminMessagingRules";
import AdminMessagingLogs from "./pages/admin/messaging/AdminMessagingLogs";

// Admin Logistics pages
import AdminLogisticsSettings from "./pages/admin/AdminLogisticsSettings";
import LogisticsDashboardMain from "./pages/logistics/LogisticsDashboardMain";
import CourierDetailPage from "./pages/logistics/CourierDetailPage";
import LogisticsControlCenter from "./pages/admin/logistics/LogisticsControlCenter";
import StaffDetail from "./pages/admin/StaffDetail";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";

// Admin Marketing pages
import InfluencerList from "./pages/admin/marketing/InfluencerList";
import Campaigns from "./pages/admin/marketing/Campaigns";
import VideoProduction from "./pages/admin/marketing/VideoProduction";
import ContentCalendar from "./pages/admin/marketing/ContentCalendar";
import MarketingReports from "./pages/admin/marketing/MarketingReports";

// AI Insights
import AIInsights from "./pages/admin/AIInsights";
import AILeads from "./pages/admin/AILeads";

// Accounting pages
import AccountingDashboard from "./pages/admin/accounting/AccountingDashboard";
import AccountingDashboardNew from "./pages/admin/accounting/AccountingDashboardNew";
import AuditDashboard from "./pages/admin/accounting/AuditDashboard";
import NewDeposit from "./pages/admin/accounting/NewDeposit";
import NewExpense from "./pages/admin/accounting/NewExpense";
import NewTransfer from "./pages/admin/accounting/NewTransfer";
import ViewTransactions from "./pages/admin/accounting/ViewTransactions";
import AccountsManagement from "./pages/admin/accounting/AccountsManagement";
import CashBank from "./pages/admin/accounting/CashBank";
import PartyStatement from "./pages/admin/accounting/PartyStatement";
import CategoryManagement from "./pages/admin/accounting/CategoryManagement";
import ActivityLog from "./pages/admin/accounting/ActivityLog";

// Inventory pages
import StockSummary from "./pages/inventory/StockSummary";
import StockMovements from "./pages/inventory/StockMovements";
import InventoryActivityLog from "./pages/inventory/InventoryActivityLog";
import Parties from "./pages/inventory/Parties";
import Warehouses from "./pages/inventory/Warehouses";
import WarehouseDetail from "./pages/inventory/WarehouseDetail";
import DailyPL from "./pages/inventory/DailyPL";
import AIStockReorder from "./pages/inventory/AIStockReorder";

// HRM pages
import HRMEmployees from "./pages/hrm/HRMEmployees";
import StaffSelfService from "./pages/staff/StaffSelfService";
import HRMPayroll from "./pages/hrm/HRMPayroll";
import HRMPolicies from "./pages/hrm/HRMPolicies";
import HRMHolidays from "./pages/hrm/HRMHolidays";
import HRMLeave from "./pages/hrm/HRMLeave";
import HRMNotices from "./pages/hrm/HRMNotices";
import HRMTeamStructure from "./pages/hrm/HRMTeamStructure";
import HRMCompanyInfo from "./pages/hrm/HRMCompanyInfo";
import HRMSalarySlip from "./pages/hrm/HRMSalarySlip";
import HRMAssets from "./pages/hrm/HRMAssets";
import HRMAttendance from "./pages/hrm/HRMAttendance";
import HRMChat from "./pages/hrm/HRMChat";
import HRMLeaveQuota from "./pages/hrm/HRMLeaveQuota";
import HRMEmployeeDetail from "./pages/hrm/HRMEmployeeDetail";
import HRMStaffDocuments from "./pages/hrm/HRMStaffDocuments";
import HRMTasks from "./pages/hrm/HRMTasks";
import HRMSettings from "./pages/hrm/HRMSettings";

// HRM merged pages
import HRMAttendanceLeave from "./pages/hrm/HRMAttendanceLeave";
import HRMCompanyInfoMerged from "./pages/hrm/HRMCompanyInfoMerged";
import HRMSalaryPayroll from "./pages/hrm/HRMSalaryPayroll";
import HRMOrgSettings from "./pages/hrm/HRMOrgSettings";

// Knowledge Center pages (HRM)
import KnowledgeCenterCourses from "./pages/hrm/KnowledgeCenterCourses";
import KnowledgeCenterCourseDetail from "./pages/hrm/KnowledgeCenterCourseDetail";
import KnowledgeCenterReports from "./pages/hrm/KnowledgeCenterReports";

// Training pages (Staff)
import MyCourses from "./pages/training/MyCourses";
import CoursePlayer from "./pages/training/CoursePlayer";
import CourseQuiz from "./pages/training/CourseQuiz";
import MyCertificates from "./pages/training/MyCertificates";

// HR Role Dashboard
import HRDashboard from "./pages/hr/HRDashboard";

// Manager Role pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";

// Marketing Role pages
import MarketingDashboard from "./pages/marketing/MarketingDashboard";

// My HR pages
import MyHRDashboard from "./pages/myhr/MyHRDashboard";
import MyHRDocuments from "./pages/myhr/MyHRDocuments";
import MyHRLeave from "./pages/myhr/MyHRLeave";
import MyHRAttendance from "./pages/myhr/MyHRAttendance";
import MyHRHolidays from "./pages/myhr/MyHRHolidays";
import MyHRPolicies from "./pages/myhr/MyHRPolicies";
import MyTasks from "./pages/myhr/MyTasks";

// My HR merged pages
import MyHRAttendanceLeave from "./pages/myhr/MyHRAttendanceLeave";
import MyHRCompanyInfo from "./pages/myhr/MyHRCompanyInfo";

// Leads pages
import LeadsDashboard from "./pages/leads/LeadsDashboard";
import LeadsAll from "./pages/leads/LeadsAll";
import LeadsFollowup from "./pages/leads/LeadsFollowup";

// Calling pages
import CallingDashboard from "./pages/calling/CallingDashboard";
import CallingLeads from "./pages/calling/CallingLeads";
import CallingOrders from "./pages/calling/CallingOrders";
import CallingMyOrders from "./pages/calling/CallingMyOrders";
import CallingOrderDetail from "./pages/calling/CallingOrderDetail";

// Followup pages
import FollowupDashboard from "./pages/followup/FollowupDashboard";
import FollowupOrders from "./pages/followup/FollowupOrders";
import FollowupReports from "./pages/followup/FollowupReports";

// Portal Reports pages
import LeadsReports from "./pages/leads/LeadsReports";
import CallingReports from "./pages/calling/CallingReports";

// Logistics pages
import LogisticsDashboard from "./pages/logistics/LogisticsDashboard";
import LogisticsOrders from "./pages/logistics/LogisticsOrders";
import LogisticsInsideValley from "./pages/logistics/LogisticsInsideValley";
import LogisticsOutsideValley from "./pages/logistics/LogisticsOutsideValley";

// Logistics Portal pages (for LOGISTICS role)
import LogisticsPortalOrders from "./pages/logistics/LogisticsPortalOrders";

// Settings pages
import NotificationSettingsPage from "./pages/settings/NotificationSettingsPage";
import MyProfile from "./pages/settings/MyProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - reduce DB load from RLS-heavy queries
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchIntervalInBackground: false, // Stop ALL polling when tab is hidden — huge cost savings
      retry: 1, // Only 1 retry to prevent cascading DB load
      retryDelay: (attemptIndex) => Math.min(3000 * (attemptIndex + 1), 10000), // Backoff: 3s, 6s, 10s
    },
  },
});

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DateModeProvider>
        <TooltipProvider>
          <Suspense fallback={<Loading />}>
            <Toaster />
            <Sonner />
          </Suspense>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/update-password" element={<UpdatePassword />} />
              <Route path="/setup" element={<SetupAdmin />} />
              <Route path="/install" element={<InstallApp />} />

              {/* Main routes (using DashboardLayout with store_id filtering) */}
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminUnifiedDashboard />} />
                <Route path="/admin/sales/dashboard" element={<AdminSalesDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/roles-permissions" element={<RolesPermissions />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/branches" element={<AdminBranches />} />
                <Route path="/admin/ads" element={<AdminAds />} />
                <Route path="/admin/leads" element={<AdminLeads />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/orders/:orderId" element={<OrderDetail />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/customers/:customerId" element={<CustomerDetail />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/reports/daily-performance" element={<DailyPerformance />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/sales/activity-log" element={<SalesActivityLog />} />
                <Route path="/admin/accounting/dashboard" element={<AccountingDashboard />} />
                <Route path="/admin/accounting/dashboard-new" element={<AccountingDashboardNew />} />
                <Route path="/admin/accounting/new-deposit" element={<NewDeposit />} />
                <Route path="/admin/accounting/new-expense" element={<NewExpense />} />
                <Route path="/admin/accounting/new-transfer" element={<NewTransfer />} />
                <Route path="/admin/accounting/transactions" element={<ViewTransactions />} />
                <Route path="/admin/accounting/accounts" element={<AccountsManagement />} />
                <Route path="/admin/accounting/cash-bank" element={<CashBank />} />
                <Route path="/admin/accounting/party-statement" element={<PartyStatement />} />
                <Route path="/admin/accounting/categories" element={<CategoryManagement />} />
                <Route path="/admin/accounting/activity-log" element={<ActivityLog />} />
                <Route path="/admin/accounting/audit" element={<AuditDashboard />} />
                <Route path="/admin/staff-targets" element={<AdminStaffTargets />} />
                <Route path="/admin/sales-settings" element={<SalesSettings />} />
                <Route path="/admin/staff/:staffId" element={<StaffDetail />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/branding" element={<AdminBranding />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/data-tools" element={<AdminDataTools />} />
                <Route path="/admin/stores" element={<Stores />} />
                <Route path="/admin/stores/:storeId" element={<StoreDetail />} />
                <Route path="/admin/messaging/channels" element={<AdminMessagingChannels />} />
                <Route path="/admin/messaging/templates" element={<AdminMessagingTemplates />} />
                <Route path="/admin/messaging/rules" element={<AdminMessagingRules />} />
                <Route path="/admin/messaging/logs" element={<AdminMessagingLogs />} />
                <Route path="/admin/logistics/control-center" element={<LogisticsControlCenter />} />
                <Route path="/admin/logistics-settings" element={<AdminLogisticsSettings />} />
                <Route path="/admin/logistics-dashboard" element={<LogisticsDashboardMain />} />
                <Route path="/admin/logistics/:courier" element={<CourierDetailPage />} />
                <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
                <Route path="/orders/:orderId" element={<AdminOrderDetail />} />
                <Route path="/admin/marketing/ads" element={<AdminAds />} />
                <Route path="/admin/marketing/influencers" element={<InfluencerList />} />
                <Route path="/admin/marketing/campaigns" element={<Campaigns />} />
                <Route path="/admin/marketing/video-projects" element={<VideoProduction />} />
                <Route path="/admin/marketing/content-calendar" element={<ContentCalendar />} />
                <Route path="/admin/marketing/reports" element={<MarketingReports />} />
                <Route path="/admin/ai-insights" element={<AIInsights />} />
                <Route path="/admin/ai-leads" element={<AILeads />} />
                <Route path="/admin/inventory/stock-summary" element={<StockSummary />} />
                <Route path="/admin/inventory/movements" element={<StockMovements />} />
                <Route path="/admin/inventory/activity-log" element={<InventoryActivityLog />} />
                <Route path="/admin/inventory/parties" element={<Parties />} />
                <Route path="/admin/inventory/warehouses" element={<Warehouses />} />
                <Route path="/admin/inventory/warehouses/:warehouseId" element={<WarehouseDetail />} />
                <Route path="/admin/inventory/daily-pl" element={<DailyPL />} />
                <Route path="/admin/inventory/ai-reorder" element={<AIStockReorder />} />
                <Route path="/hrm" element={<HRDashboard />} />
                <Route path="/hrm/employees" element={<HRMEmployees />} />
                <Route path="/hrm/employees/:id" element={<HRMEmployeeDetail />} />
                <Route path="/hrm/staff-documents" element={<HRMStaffDocuments />} />
                <Route path="/hrm/payroll" element={<HRMPayroll />} />
                <Route path="/hrm/policies" element={<HRMPolicies />} />
                <Route path="/hrm/holidays" element={<HRMHolidays />} />
                <Route path="/hrm/leave" element={<HRMLeave />} />
                <Route path="/hrm/leave-quota" element={<HRMLeaveQuota />} />
                <Route path="/hrm/notices" element={<HRMNotices />} />
                <Route path="/hrm/team-structure" element={<HRMTeamStructure />} />
                <Route path="/hrm/company-info" element={<HRMCompanyInfoMerged />} />
                <Route path="/hrm/salary-slips" element={<HRMSalarySlip />} />
                <Route path="/hrm/assets" element={<HRMAssets />} />
                <Route path="/hrm/attendance" element={<HRMAttendance />} />
                <Route path="/hrm/chat" element={<HRMChat />} />
                <Route path="/hrm/tasks" element={<HRMTasks />} />
                <Route path="/hrm/settings" element={<HRMSettings />} />
                {/* HRM merged routes */}
                <Route path="/hrm/attendance-leave" element={<HRMAttendanceLeave />} />
                {/* Route kept for backward compatibility */}
                <Route path="/hrm/salary-payroll" element={<HRMSalaryPayroll />} />
                <Route path="/hrm/org-settings" element={<HRMOrgSettings />} />
                <Route path="/hrm/knowledge-center" element={<KnowledgeCenterCourses />} />
                <Route path="/hrm/knowledge-center/courses/:slug" element={<KnowledgeCenterCourseDetail />} />
                <Route path="/hrm/knowledge-center/reports" element={<KnowledgeCenterReports />} />
                <Route path="/training/my-courses" element={<MyCourses />} />
                <Route path="/training/courses/:slug" element={<CoursePlayer />} />
                <Route path="/training/courses/:slug/quiz" element={<CourseQuiz />} />
                <Route path="/training/certificates" element={<MyCertificates />} />
                <Route path="/my-hr" element={<MyHRDashboard />} />
                <Route path="/my-hr/tasks" element={<MyTasks />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/my-hr/documents" element={<MyHRDocuments />} />
                <Route path="/my-hr/chat" element={<HRMChat />} />
                <Route path="/my-hr/notices" element={<HRMNotices />} />
                <Route path="/my-hr/salary-slips" element={<StaffSelfService />} />
                {/* My HR merged routes */}
                <Route path="/my-hr/attendance-leave" element={<MyHRAttendanceLeave />} />
                <Route path="/my-hr/company-info" element={<MyHRCompanyInfo />} />
                {/* Legacy redirects for backward compatibility */}
                <Route path="/my-hr/attendance" element={<Navigate to="/my-hr/attendance-leave" replace />} />
                <Route path="/my-hr/leave" element={<Navigate to="/my-hr/attendance-leave?tab=leave" replace />} />
                <Route path="/my-hr/holidays" element={<Navigate to="/my-hr/company-info" replace />} />
                <Route path="/my-hr/policies" element={<Navigate to="/my-hr/company-info?tab=policies" replace />} />
                <Route path="/my-hr/assets" element={<Navigate to="/my-hr" replace />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/leads/dashboard" element={<LeadsDashboard />} />
                <Route path="/leads/all" element={<LeadsAll />} />
                <Route path="/leads/followup" element={<LeadsFollowup />} />
                <Route path="/leads/reports" element={<LeadsReports />} />
                <Route path="/leads/self-service" element={<StaffSelfService />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/calling/dashboard" element={<CallingDashboard />} />
                <Route path="/calling/leads" element={<CallingLeads />} />
                <Route path="/calling/orders" element={<CallingOrders />} />
                <Route path="/calling/my-orders" element={<CallingMyOrders />} />
                <Route path="/calling/orders/:orderId" element={<CallingOrderDetail />} />
                <Route path="/calling/reports" element={<CallingReports />} />
                <Route path="/calling/self-service" element={<StaffSelfService />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/followup/dashboard" element={<LogisticsPortalOrders />} />
                <Route path="/followup/orders" element={<LogisticsPortalOrders />} />
                <Route path="/followup/reports" element={<LogisticsPortalOrders />} />
                <Route path="/followup/self-service" element={<StaffSelfService />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/hr/dashboard" element={<HRDashboard />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                <Route path="/manager/reports" element={<AdminReports />} />
                <Route path="/manager/targets" element={<AdminStaffTargets />} />
                <Route path="/manager/approvals" element={<HRMLeave />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/marketing/dashboard" element={<MarketingDashboard />} />
                <Route path="/marketing/ads" element={<AdminAds />} />
                <Route path="/marketing/daybook" element={<AdminSalesDashboard />} />
                <Route path="/marketing/performance" element={<AdminReports />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/logistics/dashboard" element={<LogisticsPortalOrders />} />
                <Route path="/logistics/orders" element={<LogisticsPortalOrders />} />
                <Route path="/logistics/self-service" element={<StaffSelfService />} />
              </Route>

              {/* Redirect old logistics-portal routes to /logistics */}
              <Route path="/logistics-portal/*" element={<Navigate to="/logistics/orders" replace />} />

              <Route element={<DashboardLayout />}>
                <Route path="/inventory/stock-summary" element={<StockSummary />} />
                <Route path="/inventory/movements" element={<StockMovements />} />
                <Route path="/inventory/parties" element={<Parties />} />
                <Route path="/inventory/warehouses" element={<Warehouses />} />
                <Route path="/inventory/warehouses/:warehouseId" element={<WarehouseDetail />} />
                <Route path="/inventory/daily-pl" element={<DailyPL />} />
                <Route path="/inventory/ai-reorder" element={<AIStockReorder />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/accounting/dashboard" element={<AccountingDashboard />} />
                <Route path="/accounting/dashboard-new" element={<AccountingDashboardNew />} />
                <Route path="/accounting/new-deposit" element={<NewDeposit />} />
                <Route path="/accounting/new-expense" element={<NewExpense />} />
                <Route path="/accounting/new-transfer" element={<NewTransfer />} />
                <Route path="/accounting/transactions" element={<ViewTransactions />} />
                <Route path="/accounting/accounts" element={<AccountsManagement />} />
                <Route path="/accounting/cash-bank" element={<CashBank />} />
                <Route path="/accounting/cash-bank" element={<CashBank />} />
                <Route path="/accounting/party-statement" element={<PartyStatement />} />
                <Route path="/accounting/audit" element={<AuditDashboard />} />
              </Route>

              <Route element={<DashboardLayout />}>
                <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
                <Route path="/settings/profile" element={<MyProfile />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <DynamicBranding />
          <PWAInstallPrompt />
        </TooltipProvider>
      </DateModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
