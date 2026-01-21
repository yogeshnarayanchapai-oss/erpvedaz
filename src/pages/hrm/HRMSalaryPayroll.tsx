import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Receipt } from 'lucide-react';

// Import existing pages as components
import HRMPayrollContent from './HRMPayroll';
import HRMSalarySlipContent from './HRMSalarySlip';

export default function HRMSalaryPayroll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'payroll';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Salary & Payroll</h1>
        <p className="text-muted-foreground">Manage payroll and salary slips</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="payroll" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="slips" className="gap-2">
            <Receipt className="h-4 w-4" />
            Salary Slips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="mt-6">
          <HRMPayrollContent />
        </TabsContent>

        <TabsContent value="slips" className="mt-6">
          <HRMSalarySlipContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
