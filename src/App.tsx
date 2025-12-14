import { lazy, Suspense } from 'react';

const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DateModeProvider } from "@/contexts/DateModeContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from 'lucide-react';

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/AdminDashboard";
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
import AdminReports from "./pages/admin/AdminReports";
import DailyPerformance from "./pages/admin/reports/DailyPerformance";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminStaffTargets from "./pages/admin/AdminStaffTargets";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminDataTools from "./pages/admin/AdminDataTools";
import AdminBranding from "./pages/admin/AdminBranding";
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

// Accounting pages
import AccountingDashboard from "./pages/admin/accounting/AccountingDashboard";
import AccountingDashboardNew from "./pages/admin/accounting/AccountingDashboardNew";
import AuditDashboard from "./pages/admin/accounting/AuditDashboard";
import NewDeposit from "./pages/admin/accounting/NewDeposit";
import NewExpense from "./pages/admin/accounting/NewExpense";
import NewTransfer from "./pages/admin/accounting/NewTransfer";
import ViewTransactions from "./pages/admin/accounting/ViewTransactions";
import AccountsManagement from "./pages/admin/accounting/AccountsManagement";
import Receivables from "./pages/admin/accounting/Receivables";
import Payables from "./pages/admin/accounting/Payables";
import CashBank from "./pages/admin/accounting/CashBank";
import PartyStatement from "./pages/admin/accounting/PartyStatement";
import CategoryManagement from "./pages/admin/accounting/CategoryManagement";
import ActivityLog from "./pages/admin/accounting/ActivityLog";
import AccountingAssets from "./pages/admin/accounting/Assets";

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

const queryClient = new QueryClient();

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

              {/* Main routes (using DashboardLayout with store_id filtering) */}
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
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
                <Route path="/admin/accounting/dashboard" element={<AccountingDashboard />} />
                <Route path="/admin/accounting/dashboard-new" element={<AccountingDashboardNew />} />
                <Route path="/admin/accounting/new-deposit" element={<NewDeposit />} />
                <Route path="/admin/accounting/new-expense" element={<NewExpense />} />
                <Route path="/admin/accounting/new-transfer" element={<NewTransfer />} />
                <Route path="/admin/accounting/transactions" element={<ViewTransactions />} />
                <Route path="/admin/accounting/accounts" element={<AccountsManagement />} />
                <Route path="/admin/accounting/receivables" element={<Receivables />} />
                <Route path="/admin/accounting/payables" element={<Payables />} />
                <Route path="/admin/accounting/cash-bank" element={<CashBank />} />
                <Route path="/admin/accounting/party-statement" element={<PartyStatement />} />
                <Route path="/admin/accounting/categories" element={<CategoryManagement />} />
                <Route path="/admin/accounting/activity-log" element={<ActivityLog />} />
                <Route path="/admin/accounting/assets" element={<AccountingAssets />} />
                <Route path="/admin/accounting/audit" element={<AuditDashboard />} />
                <Route path="/admin/staff-targets" element={<AdminStaffTargets />} />
                <Route path="/admin/staff/:staffId" element={<StaffDetail />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/branding" element={<AdminBranding />} />
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
                <Route path="/admin/inventory/stock-summary" element={<StockSummary />} />
                <Route path="/admin/inventory/movements" element={<StockMovements />} />
                <Route path="/admin/inventory/activity-log" element={<InventoryActivityLog />} />
                <Route path="/admin/inventory/parties" element={<Parties />} />
                <Route path="/admin/inventory/warehouses" element={<Warehouses />} />
                <Route path="/admin/inventory/warehouses/:warehouseId" element={<WarehouseDetail />} />
                <Route path="/admin/inventory/daily-pl" element={<DailyPL />} />
                <Route path="/admin/inventory/ai-reorder" element={<AIStockReorder />} />
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
                <Route path="/hrm/company-info" element={<HRMCompanyInfo />} />
                <Route path="/hrm/salary-slips" element={<HRMSalarySlip />} />
                <Route path="/hrm/assets" element={<HRMAssets />} />
                <Route path="/hrm/attendance" element={<HRMAttendance />} />
                <Route path="/hrm/chat" element={<HRMChat />} />
                <Route path="/hrm/knowledge-center" element={<KnowledgeCenterCourses />} />
                <Route path="/hrm/knowledge-center/courses/:slug" element={<KnowledgeCenterCourseDetail />} />
                <Route path="/hrm/knowledge-center/reports" element={<KnowledgeCenterReports />} />
                <Route path="/training/my-courses" element={<MyCourses />} />
                <Route path="/training/courses/:slug" element={<CoursePlayer />} />
                <Route path="/training/courses/:slug/quiz" element={<CourseQuiz />} />
                <Route path="/training/certificates" element={<MyCertificates />} />
                <Route path="/my-hr" element={<MyHRDashboard />} />
                <Route path="/my-hr/documents" element={<MyHRDocuments />} />
                <Route path="/my-hr/attendance" element={<MyHRAttendance />} />
                <Route path="/my-hr/leave" element={<MyHRLeave />} />
                <Route path="/my-hr/assets" element={<MyHRDashboard />} />
                <Route path="/my-hr/chat" element={<HRMChat />} />
                <Route path="/my-hr/holidays" element={<MyHRHolidays />} />
                <Route path="/my-hr/policies" element={<MyHRPolicies />} />
                <Route path="/my-hr/notices" element={<HRMNotices />} />
                <Route path="/my-hr/salary-slips" element={<StaffSelfService />} />
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
                <Route path="/marketing/daybook" element={<AdminDashboard />} />
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
                <Route path="/accounting/receivables" element={<Receivables />} />
                <Route path="/accounting/payables" element={<Payables />} />
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
        </TooltipProvider>
      </DateModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
