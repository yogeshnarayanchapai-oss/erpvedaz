import { useEffect, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CurrentStoreProvider, useCurrentStore } from '@/contexts/CurrentStoreContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { DateModeToggle } from '@/components/DateModeToggle';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { StoreSwitcher } from './StoreSwitcher';
import { TeamChatButton } from '@/components/chat/TeamChatButton';
import { NoticePopup } from '@/components/hrm/NoticePopup';
import { Loader2, Calendar, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrentBSDate, getBSMonthName } from '@/lib/nepaliDate';
import { getRoleDisplayLabel, isAdminOrManager } from '@/lib/roleUtils';

function DashboardLayoutInner() {
  const { user, profile, loading, signOut } = useAuth();
  const { currentStore } = useCurrentStore();
  const navigate = useNavigate();
  const location = useLocation();

  const portalName = getRoleDisplayLabel(profile?.role);
  const storeName = currentStore?.name || 'Dashboard';

  // Get page name from current route
  const pageName = useMemo(() => {
    const path = location.pathname;
    
    // Marketing routes
    if (path.includes('/marketing')) {
      if (path.includes('/ads')) return 'Manage Ads';
      if (path.includes('/daybook')) return 'Product Daybook';
      if (path.includes('/performance')) return 'Performance';
      if (path.includes('/campaigns')) return 'Campaigns';
      if (path.includes('/influencers')) return 'Influencers';
      if (path.includes('/content-calendar')) return 'Content Calendar';
      if (path.includes('/social-channels')) return 'Social Channels';
      if (path.includes('/video-production')) return 'Video Production';
      if (path.includes('/reports')) return 'Marketing Reports';
      return 'Marketing Dashboard';
    }
    
    // Admin routes
    if (path.includes('/admin')) {
      if (path.includes('/leads')) return 'Leads Management';
      if (path.includes('/orders')) return 'Orders Management';
      if (path.includes('/customers')) return 'Customers';
      if (path.includes('/products')) return 'Products';
      if (path.includes('/users')) return 'Users Management';
      if (path.includes('/analytics')) return 'Analytics';
      if (path.includes('/reports')) return 'Reports';
      if (path.includes('/notifications')) return 'Notifications';
      if (path.includes('/stores')) return 'Stores';
      if (path.includes('/branding')) return 'Branding';
      if (path.includes('/branches')) return 'Branches';
      if (path.includes('/logistics')) return 'Logistics Settings';
      if (path.includes('/accounting')) return 'Accounting';
      return 'Admin Dashboard';
    }
    
    // Calling routes
    if (path.includes('/calling')) {
      if (path.includes('/my-orders')) return 'My Orders';
      if (path.includes('/orders')) return 'All Orders';
      if (path.includes('/leads')) return 'My Leads';
      if (path.includes('/customers')) return 'Customers';
      if (path.includes('/reports')) return 'Reports';
      return 'Calling Dashboard';
    }
    
    // Leads routes
    if (path.includes('/leads')) {
      if (path.includes('/all')) return 'All Leads';
      if (path.includes('/followup')) return 'Follow-up Leads';
      if (path.includes('/reports')) return 'Lead Reports';
      return 'Leads Dashboard';
    }
    
    // Follow-up routes
    if (path.includes('/followup')) {
      if (path.includes('/orders')) return 'Follow-up Orders';
      if (path.includes('/reports')) return 'Follow-up Reports';
      return 'Follow-up Dashboard';
    }
    
    // Logistics routes
    if (path.includes('/logistics')) {
      if (path.includes('/inside-valley')) return 'Inside Valley';
      if (path.includes('/outside-valley')) return 'Outside Valley';
      if (path.includes('/orders')) return 'Logistics Orders';
      if (path.includes('/portal-orders')) return 'Portal Orders';
      if (path.includes('/control-center')) return 'Control Center';
      return 'Logistics Dashboard';
    }
    
    // Inventory routes
    if (path.includes('/inventory')) {
      if (path.includes('/daily-pl')) return 'Daily P/L';
      if (path.includes('/stock-summary')) return 'Stock Summary';
      if (path.includes('/stock-movements')) return 'Stock Movements';
      if (path.includes('/warehouses')) return 'Warehouses';
      if (path.includes('/parties')) return 'Parties';
      if (path.includes('/ai-reorder')) return 'AI Stock Reorder';
      return 'Inventory';
    }
    
    // HRM routes
    if (path.includes('/hrm') || path.includes('/my-hr')) {
      if (path.includes('/employees')) return 'Employees';
      if (path.includes('/attendance')) return 'Attendance';
      if (path.includes('/leave')) return 'Leave Management';
      if (path.includes('/payroll')) return 'Payroll';
      if (path.includes('/documents')) return 'Documents';
      if (path.includes('/assets')) return 'Assets';
      if (path.includes('/holidays')) return 'Holidays';
      if (path.includes('/notices')) return 'Notices';
      if (path.includes('/policies')) return 'Policies';
      if (path.includes('/chat')) return 'Team Chat';
      return 'HRM Dashboard';
    }
    
    // Default to role-based portal name
    return `${portalName} Dashboard`;
  }, [location.pathname, portalName]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Update document title based on portal, page and store
  useEffect(() => {
    const portalFirstWord = portalName.split(' ')[0];
    // If pageName ends with "Dashboard", just use "Dashboard" to avoid redundancy
    const displayPageName = pageName.endsWith('Dashboard') ? 'Dashboard' : pageName;
    const title = currentStore?.name 
      ? `${portalFirstWord} ${displayPageName} - ${currentStore.name}`
      : `${portalFirstWord} ${displayPageName}`;
    document.title = title;
  }, [pageName, portalName, currentStore?.name]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Mobile-optimized header */}
          <header className="flex h-12 md:h-14 shrink-0 items-center gap-1 md:gap-2 border-b bg-background px-2 md:px-4 sticky top-0 z-40">
            <SidebarTrigger className="-ml-1 h-9 w-9 md:h-10 md:w-10" />
            <Separator orientation="vertical" className="mr-1 md:mr-2 h-4 hidden sm:block" />
            
            {/* Store Switcher - compact on mobile */}
            <StoreSwitcher />
            
            {/* Breadcrumb - hidden on mobile */}
            <div className="hidden md:flex items-center">
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-sm font-medium">
                      {pageName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            <div className="ml-auto flex items-center gap-1 md:gap-4">
              {/* Date - hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="text-foreground font-medium">
                  ({getCurrentBSDate().day} {getBSMonthName(getCurrentBSDate().month)} {getCurrentBSDate().year})
                </span>
              </div>
              <Separator orientation="vertical" className="h-4 hidden lg:block" />
              
              <UnifiedNotificationBell 
                showViewAll={isAdminOrManager(profile.role)}
                viewAllPath="/admin/notifications"
              />
              
              {/* Date toggle - always visible but compact on mobile */}
              <DateModeToggle />
              
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 md:gap-2 h-9 px-2 md:px-3">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">{profile.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">{getRoleDisplayLabel(profile.role)}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Mobile: show date info in dropdown */}
                  <div className="lg:hidden px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="mt-0.5 text-foreground font-medium">
                      {getCurrentBSDate().day} {getBSMonthName(getCurrentBSDate().month)} {getCurrentBSDate().year} BS
                    </div>
                  </div>
                  
                  <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                      navigate('/auth');
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          {/* Mobile page title */}
          <div className="md:hidden px-4 py-2 border-b border-border bg-muted/30">
            <h1 className="text-sm font-medium text-foreground truncate">{pageName}</h1>
          </div>
          
          {/* Main content - responsive padding, full height */}
          <main className="flex-1 p-2 md:p-4 overflow-auto flex flex-col">
            <Outlet />
          </main>
        </SidebarInset>
        
        {/* Floating Team Chat Button - positioned for mobile */}
        <TeamChatButton />
        
        {/* Notice Popup */}
        <NoticePopup />
      </div>
    </SidebarProvider>
  );
}

export function DashboardLayout() {
  return (
    <CurrentStoreProvider>
      <DashboardLayoutInner />
    </CurrentStoreProvider>
  );
}
