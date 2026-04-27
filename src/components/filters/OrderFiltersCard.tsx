import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, MapPin, Filter, X } from 'lucide-react';
import { ActiveStoreBadge } from '@/components/filters/ActiveStoreBadge';

export type DatePreset = 'today' | 'yesterday' | 'last30' | 'custom';
export type DeliveryFilter = 'ALL' | 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';
export type OrderStatusFilter = 'ALL' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'REDIRECT' | 'CANCELLED';
export type InsideDeliveryStatusFilter = 'ALL' | 'PENDING' | 'DELIVERED' | 'REACHED_CNR' | 'CUSTOMER_CANCELLED';

export const ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REDIRECT', label: 'Redirect' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const INSIDE_DELIVERY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Delivery Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REACHED_CNR', label: 'Reached - CNR' },
  { value: 'CUSTOMER_CANCELLED', label: 'Customer Cancelled' },
];

interface Product {
  id: string;
  name: string;
}

interface OrderFiltersCardProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;
  customDateFrom: string;
  onCustomDateFromChange: (value: string) => void;
  customDateTo: string;
  onCustomDateToChange: (value: string) => void;
  deliveryFilter: DeliveryFilter;
  onDeliveryFilterChange: (value: DeliveryFilter) => void;
  statusFilter: OrderStatusFilter;
  onStatusFilterChange: (value: OrderStatusFilter) => void;
  insideDeliveryStatusFilter: InsideDeliveryStatusFilter;
  onInsideDeliveryStatusFilterChange: (value: InsideDeliveryStatusFilter) => void;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  products: Product[];
  onReset: () => void;
  // Optional: for admin to show additional filters
  showStaffFilter?: boolean;
  staffFilter?: string;
  onStaffFilterChange?: (value: string) => void;
  staff?: { id: string; name: string }[];
}

export function OrderFiltersCard({
  searchQuery,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  deliveryFilter,
  onDeliveryFilterChange,
  statusFilter,
  onStatusFilterChange,
  insideDeliveryStatusFilter,
  onInsideDeliveryStatusFilterChange,
  productFilter,
  onProductFilterChange,
  products,
  onReset,
  showStaffFilter = false,
  staffFilter,
  onStaffFilterChange,
  staff = [],
}: OrderFiltersCardProps) {
  // Check if any filter is active (not at default value)
  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    datePreset !== 'today' ||
    deliveryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    insideDeliveryStatusFilter !== 'ALL' ||
    productFilter !== 'all' ||
    (showStaffFilter && staffFilter && staffFilter !== 'all');
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <ActiveStoreBadge />
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Name / Phone / Reference..."
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
          
          {/* Date Preset */}
          <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
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
          
          {/* Location Filter */}
          <Select value={deliveryFilter} onValueChange={(v) => {
            onDeliveryFilterChange(v as DeliveryFilter);
          }}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Locations</SelectItem>
              <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
              <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Order Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as OrderStatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Delivery Status Filter - always visible */}
          <Select value={insideDeliveryStatusFilter} onValueChange={(v) => onInsideDeliveryStatusFilterChange(v as InsideDeliveryStatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Delivery Status" />
            </SelectTrigger>
            <SelectContent>
              {INSIDE_DELIVERY_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Product Filter */}
          <Select value={productFilter} onValueChange={onProductFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Staff Filter - Admin only */}
          {showStaffFilter && staff.length > 0 && onStaffFilterChange && (
            <Select value={staffFilter || 'all'} onValueChange={onStaffFilterChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Clear Button - Only show when filters are active */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
