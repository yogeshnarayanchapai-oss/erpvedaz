import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, Clock, X } from 'lucide-react';

export type DatePreset = 'today' | 'last30' | 'custom';
export type FollowupFilterType = 'ALL' | 'today' | 'upcoming' | 'pending' | 'overdue';

export const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'REMAINING', label: 'Remaining to Call' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'NEW', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'CALL_NOT_RECEIVED', label: 'Call Not Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REDIRECT', label: 'Redirect' },
];

export const ADMIN_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_transfer', label: 'Pending Transfer' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'NEW', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'CALL_NOT_RECEIVED', label: 'Call Not Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REDIRECT', label: 'Redirect' },
];

export const FOLLOWUP_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Follow-Ups' },
  { value: 'today', label: 'Today Follow-Ups' },
  { value: 'upcoming', label: 'Upcoming Follow-Ups' },
  { value: 'pending', label: 'Pending Follow-Ups' },
  { value: 'overdue', label: 'Overdue Follow-Ups' },
];

// Unified date presets for both Admin and Calling
export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

// Keep these for backward compatibility
export const ADMIN_DATE_PRESETS = DATE_PRESETS;
export const CALLING_DATE_PRESETS = DATE_PRESETS;

interface Product {
  id: string;
  name: string;
}

interface LeadFiltersCardProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;
  customDateFrom: string;
  onCustomDateFromChange: (value: string) => void;
  customDateTo: string;
  onCustomDateToChange: (value: string) => void;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  products: Product[];
  onReset: () => void;
  // Optional: Calling portal uses follow-up filter
  showFollowupFilter?: boolean;
  followupFilter?: FollowupFilterType;
  onFollowupFilterChange?: (value: FollowupFilterType) => void;
  // Optional: Admin uses assigned to filter
  showAssignedToFilter?: boolean;
  assignedToFilter?: string;
  onAssignedToFilterChange?: (value: string) => void;
  callingStaff?: { id: string; name: string }[];
  // Whether to use admin status/date options
  isAdmin?: boolean;
}

export function LeadFiltersCard({
  searchQuery,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  productFilter,
  onProductFilterChange,
  statusFilter,
  onStatusFilterChange,
  products,
  onReset,
  showFollowupFilter = false,
  followupFilter = 'ALL',
  onFollowupFilterChange,
  showAssignedToFilter = false,
  assignedToFilter = 'all',
  onAssignedToFilterChange,
  callingStaff = [],
  isAdmin = false,
}: LeadFiltersCardProps) {
  const statusOptions = isAdmin ? ADMIN_STATUS_FILTER_OPTIONS : STATUS_FILTER_OPTIONS;
  const datePresets = isAdmin ? ADMIN_DATE_PRESETS : CALLING_DATE_PRESETS;
  
  // Default values for each filter type
  const defaultDatePreset = isAdmin ? 'today' : 'today';
  const defaultStatus = isAdmin ? 'all' : 'ALL';
  const defaultProduct = 'ALL';
  const defaultFollowup = 'ALL';
  const defaultAssignedTo = 'all';
  
  // Check if any filter is active (not at default value)
  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    datePreset !== defaultDatePreset ||
    productFilter !== defaultProduct ||
    statusFilter !== defaultStatus ||
    (showFollowupFilter && followupFilter !== defaultFollowup) ||
    (showAssignedToFilter && assignedToFilter !== defaultAssignedTo);
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, reference..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Filter with Presets */}
          <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {datePresets.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => onCustomDateFromChange(e.target.value)}
                className="w-36"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => onCustomDateToChange(e.target.value)}
                className="w-36"
              />
            </div>
          )}

          {/* Product Filter */}
          <Select value={productFilter} onValueChange={onProductFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Products</SelectItem>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Follow-Up Filter - Calling Portal */}
          {showFollowupFilter && onFollowupFilterChange && (
            <Select value={followupFilter} onValueChange={(v) => onFollowupFilterChange(v as FollowupFilterType)}>
              <SelectTrigger className="w-[180px]">
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Follow-Ups" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWUP_FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Assigned To Filter - Admin */}
          {showAssignedToFilter && onAssignedToFilterChange && (
            <Select value={assignedToFilter} onValueChange={onAssignedToFilterChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {callingStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear Button - Only show when filters are active */}
          {hasActiveFilters && (
            <Button variant="outline" onClick={onReset}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
