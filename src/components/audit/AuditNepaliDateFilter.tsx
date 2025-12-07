import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Calendar } from 'lucide-react';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { getCurrentBSDate, getBSMonthName, bsToAd } from '@/lib/nepaliDate';
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import { useDateMode } from '@/contexts/DateModeContext';
import { AuditFilters } from '@/hooks/useAuditDashboard';

interface AuditNepaliDateFilterProps {
  filters: AuditFilters;
  onFilterChange: (filters: AuditFilters) => void;
}

const currentBS = getCurrentBSDate();
const bsYears = Array.from({ length: 6 }, (_, i) => currentBS.year - i);
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const bsMonths = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: getBSMonthName(i + 1),
}));

export function AuditNepaliDateFilter({ filters, onFilterChange }: AuditNepaliDateFilterProps) {
  const { dateMode } = useDateMode();
  const [filterType, setFilterType] = useState<'year' | 'quarter' | 'month' | 'custom'>('year');
  const [selectedBSYear, setSelectedBSYear] = useState(currentBS.year);
  const [selectedBSMonth, setSelectedBSMonth] = useState(currentBS.month);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');

  const handleYearChange = (year: string) => {
    const bsYear = parseInt(year);
    setSelectedBSYear(bsYear);
    
    // Convert BS year to AD date range
    const startAD = bsToAd(bsYear, 1, 1);
    const endAD = bsToAd(bsYear, 12, getDaysInBSMonth(bsYear, 12));
    
    onFilterChange({
      ...filters,
      fiscalYear: `${bsYear}/${bsYear + 1}`,
      fiscalQuarter: undefined,
      fiscalMonth: undefined,
      startDate: format(startAD, 'yyyy-MM-dd'),
      endDate: format(endAD, 'yyyy-MM-dd'),
    });
  };

  const handleQuarterChange = (quarter: string) => {
    setSelectedQuarter(quarter);
    const qNum = parseInt(quarter.replace('Q', ''));
    const startMonth = (qNum - 1) * 3 + 1;
    const endMonth = qNum * 3;
    
    const startAD = bsToAd(selectedBSYear, startMonth, 1);
    const endAD = bsToAd(selectedBSYear, endMonth, getDaysInBSMonth(selectedBSYear, endMonth));
    
    onFilterChange({
      ...filters,
      fiscalYear: `${selectedBSYear}/${selectedBSYear + 1}`,
      fiscalQuarter: quarter,
      fiscalMonth: undefined,
      startDate: format(startAD, 'yyyy-MM-dd'),
      endDate: format(endAD, 'yyyy-MM-dd'),
    });
  };

  const handleMonthChange = (month: string) => {
    const bsMonth = parseInt(month);
    setSelectedBSMonth(bsMonth);
    
    const startAD = bsToAd(selectedBSYear, bsMonth, 1);
    const endAD = bsToAd(selectedBSYear, bsMonth, getDaysInBSMonth(selectedBSYear, bsMonth));
    
    onFilterChange({
      ...filters,
      fiscalYear: `${selectedBSYear}/${selectedBSYear + 1}`,
      fiscalQuarter: undefined,
      fiscalMonth: getBSMonthName(bsMonth),
      startDate: format(startAD, 'yyyy-MM-dd'),
      endDate: format(endAD, 'yyyy-MM-dd'),
    });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      ...filters,
      fiscalYear: undefined,
      fiscalQuarter: undefined,
      fiscalMonth: undefined,
      [field]: value,
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter By:</span>
          </div>

          {/* Filter Type Selector */}
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Year Selector (always shown except custom) */}
          {filterType !== 'custom' && (
            <Select value={selectedBSYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="BS Year" />
              </SelectTrigger>
              <SelectContent>
                {bsYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} BS
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Quarter Selector */}
          {filterType === 'quarter' && (
            <Select value={selectedQuarter} onValueChange={handleQuarterChange}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                {quarters.map(q => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month Selector */}
          {filterType === 'month' && (
            <Select value={selectedBSMonth.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {bsMonths.map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Custom Date Range */}
          {filterType === 'custom' && (
            <div className="flex items-center gap-2">
              <NepaliDatePicker
                value={filters.startDate}
                onChange={(date) => handleCustomDateChange('startDate', date)}
                placeholder="Start Date (BS)"
                className="w-48"
              />
              <span className="text-muted-foreground">to</span>
              <NepaliDatePicker
                value={filters.endDate}
                onChange={(date) => handleCustomDateChange('endDate', date)}
                placeholder="End Date (BS)"
                className="w-48"
              />
            </div>
          )}

          {/* Current Period Display */}
          <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {filters.fiscalMonth && `${filters.fiscalMonth} `}
            {filters.fiscalQuarter && `${filters.fiscalQuarter} `}
            {filters.fiscalYear || 'Custom Range'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDaysInBSMonth(year: number, month: number): number {
  const BS_YEAR_DATA: Record<number, number[]> = {
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2083: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2085: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  };
  const yearData = BS_YEAR_DATA[year];
  if (yearData) return yearData[month - 1];
  const defaultDays = [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31];
  return defaultDays[month - 1];
}
