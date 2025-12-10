import { useEffect } from 'react';
import { useNavigate, Outlet, useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { StoreSidebar } from './StoreSidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { DateModeToggle } from '@/components/DateModeToggle';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { StoreSwitcherPath } from './StoreSwitcherPath';
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

interface StoreContext {
  store: {
    id: string;
    name: string;
    slug: string;
  };
  storeSlug: string;
}

export function StoreDashboardLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const context = useOutletContext<StoreContext>();
  const navigate = useNavigate();

  const store = context?.store;
  const portalName = profile?.role ? `${profile.role.charAt(0)}${profile.role.slice(1).toLowerCase()}` : '';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Update document title based on portal and store
  useEffect(() => {
    if (profile?.role && store?.name) {
      document.title = `${portalName} - ${store.name}`;
    } else if (profile?.role) {
      document.title = `${portalName} Dashboard`;
    }
    return () => {
      document.title = 'ERP System';
    };
  }, [profile?.role, portalName, store?.name]);

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
        <StoreSidebar storeSlug={storeSlug || ''} storeName={store?.name || ''} />
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            
            {/* Store Switcher for Path-based routing */}
            <StoreSwitcherPath currentStoreSlug={storeSlug || ''} />
            
            <Separator orientation="vertical" className="mx-2 h-4" />
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-medium capitalize">
                    {profile.role.toLowerCase()} Dashboard
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
                showViewAll={profile.role === 'ADMIN' || profile.role === 'MANAGER' || profile.role === 'OWNER'}
                viewAllPath={storeSlug ? `/${storeSlug}/admin/notifications` : '/admin/notifications'}
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
                      <p className="text-xs text-muted-foreground capitalize">{profile.role.toLowerCase()}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(storeSlug ? `/${storeSlug}/settings/profile` : '/settings/profile')}>
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
            <Outlet context={{ store, storeSlug }} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
