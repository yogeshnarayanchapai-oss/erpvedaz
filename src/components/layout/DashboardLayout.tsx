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

  // Update document title based on current page and store
  useEffect(() => {
    if (currentStore?.name) {
      document.title = `${pageName} - ${currentStore.name}`;
    } else {
      document.title = pageName;
    }
  }, [pageName, currentStore?.name]);

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
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            
            {/* Store Switcher */}
            <StoreSwitcher />
            
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
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="text-foreground font-medium">
                  ({getCurrentBSDate().day} {getBSMonthName(getCurrentBSDate().month)} {getCurrentBSDate().year})
                </span>
              </div>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <UnifiedNotificationBell 
                showViewAll={isAdminOrManager(profile.role)}
                viewAllPath="/admin/notifications"
              />
              <DateModeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{profile.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">{getRoleDisplayLabel(profile.role)}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
        
        {/* Floating Team Chat Button */}
        <TeamChatButton />
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
