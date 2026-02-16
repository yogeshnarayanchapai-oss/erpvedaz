import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Palette, Bell, Database, BookOpen, Calendar as CalendarIcon, Building2, Link2 } from 'lucide-react';
import { useDateMode } from '@/contexts/DateModeContext';
import { getCurrentBSDate, getBSMonthName } from '@/lib/nepaliDate';

// Import existing components
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { LeadSourcesManagement } from '@/components/admin/LeadSourcesManagement';
import { OrderCopyFormatEditor } from '@/components/admin/OrderCopyFormatEditor';

// Import tab content components
import BrandingSettingsTab from '@/components/settings/BrandingSettingsTab';
import DataToolsSettingsTab from '@/components/settings/DataToolsSettingsTab';
import KnowledgeSettingsTab from '@/components/settings/KnowledgeSettingsTab';
import SocialBoxSettingsTab from '@/components/settings/SocialBoxSettingsTab';

// Import HRM Settings component
import HRMSettings from '@/pages/hrm/HRMSettings';

const ADMIN_ROLES = ['ADMIN', 'OWNER', 'MANAGER', 'HR'];

// General Settings Tab Content
function GeneralSettingsTab() {
  const { dateMode, setDateMode } = useDateMode();
  const bsDate = getCurrentBSDate();
  
  const adDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const bsDateStr = `${bsDate.day} ${getBSMonthName(bsDate.month)} ${bsDate.year}`;
  
  return (
    <div className="space-y-6">
      {/* Calendar/Date Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar Display
          </CardTitle>
          <CardDescription>
            Choose date format for the entire system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={dateMode}
            onValueChange={(value) => setDateMode(value as 'AD' | 'BS')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="AD" id="ad" />
              <Label htmlFor="ad" className="flex-1 cursor-pointer">
                <div className="font-medium">English (AD)</div>
                <div className="text-sm text-muted-foreground">{adDate}</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="BS" id="bs" />
              <Label htmlFor="bs" className="flex-1 cursor-pointer">
                <div className="font-medium">Nepali (BS)</div>
                <div className="text-sm text-muted-foreground">{bsDateStr}</div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Order Copy Format Editor (from Sales Settings) */}
      <OrderCopyFormatEditor />

      {/* Lead Sources Management (from Sales Settings) */}
      <LeadSourcesManagement />

      {/* HRM Settings - Leave Types, Departments, Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            HRM Settings
          </CardTitle>
          <CardDescription>
            Manage leave types, departments, and bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <HRMSettings />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSettings() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  
  const isOwner = profile?.role === 'OWNER';
  const isAdmin = profile?.role && ADMIN_ROLES.includes(profile.role);

  // Only ADMIN roles can access
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage system configurations and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="data-tools" className="gap-2">
              <Database className="h-4 w-4" />
              Data Tools
            </TabsTrigger>
          )}
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="ai-connect" className="gap-2">
            <Link2 className="h-4 w-4" />
            AI Connect
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <BrandingSettingsTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <div className="max-w-2xl">
            <NotificationSettings />
          </div>
        </TabsContent>

        {isOwner && (
          <TabsContent value="data-tools" className="mt-6">
            <DataToolsSettingsTab />
          </TabsContent>
        )}

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeSettingsTab />
        </TabsContent>

        <TabsContent value="ai-connect" className="mt-6">
          <SocialBoxSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
