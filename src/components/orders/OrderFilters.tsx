import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface OrderFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  onReset: () => void;
}

export function OrderFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  onReset,
}: OrderFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-lg border">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer, phone, order ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="Order Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="SENT_FOR_DELIVERY">Waiting Pickup</SelectItem>
          <SelectItem value="DELIVERED">Delivered</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
          <SelectItem value="RETURNED">RTO</SelectItem>
        </SelectContent>
      </Select>
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="Date Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODAY">Today</SelectItem>
          <SelectItem value="7_DAYS">Last 7 Days</SelectItem>
          <SelectItem value="30_DAYS">Last 30 Days</SelectItem>
          <SelectItem value="ALL">All Time</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
