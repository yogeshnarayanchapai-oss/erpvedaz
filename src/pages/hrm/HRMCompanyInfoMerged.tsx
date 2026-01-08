import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText } from 'lucide-react';

// Import existing pages as components - they will be rendered directly with full edit capabilities
import HRMHolidays from './HRMHolidays';
import HRMPolicies from './HRMPolicies';

export default function HRMCompanyInfoMerged() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'policies';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Company Info</h1>
        <p className="text-muted-foreground">Manage company holidays, events, and HR policies</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="h-4 w-4" />
            HR Policies
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-2">
            <Calendar className="h-4 w-4" />
            Holidays & Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-6" forceMount={activeTab === 'policies' ? true : undefined} hidden={activeTab !== 'policies'}>
          {activeTab === 'policies' && <HRMPolicies key="policies-tab" />}
        </TabsContent>

        <TabsContent value="holidays" className="mt-6" forceMount={activeTab === 'holidays' ? true : undefined} hidden={activeTab !== 'holidays'}>
          {activeTab === 'holidays' && <HRMHolidays key="holidays-tab" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
