import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2 } from 'lucide-react';

// Import existing pages as components
import HRMSettingsContent from './HRMSettings';

export default function HRMOrgSettings() {
  // Since Team Structure is now in Company Info, this page only has HRM Settings
  // Keeping the tabs structure for future extensibility
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">HRM Settings</h1>
        <p className="text-muted-foreground">Configure HRM system preferences</p>
      </div>

      <HRMSettingsContent />
    </div>
  );
}
