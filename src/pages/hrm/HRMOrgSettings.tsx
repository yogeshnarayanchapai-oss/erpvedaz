import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Settings2 } from 'lucide-react';

// Import existing pages as components
import HRMTeamStructureContent from './HRMTeamStructure';
import HRMSettingsContent from './HRMSettings';

export default function HRMOrgSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'structure';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">Manage team structure and HRM configurations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="structure" className="gap-2">
            <Network className="h-4 w-4" />
            Team Structure
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            HRM Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-6">
          <HRMTeamStructureContent />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <HRMSettingsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
