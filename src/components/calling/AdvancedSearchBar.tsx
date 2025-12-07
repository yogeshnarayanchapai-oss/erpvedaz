import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download, RotateCcw } from 'lucide-react';

export interface SearchFilters {
  searchText?: string;
  referenceId?: string;
  fromDate?: string;
  toDate?: string;
}

interface AdvancedSearchBarProps {
  onApply: (filters: SearchFilters) => void;
  onReset: () => void;
  onExport?: () => void;
  searchPlaceholder?: string;
  referencePlaceholder?: string;
}

export function AdvancedSearchBar({
  onApply,
  onReset,
  onExport,
  searchPlaceholder = 'Search Order, Phone, Name',
  referencePlaceholder = 'Search Reference Id',
}: AdvancedSearchBarProps) {
  const [searchText, setSearchText] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Debounce search text
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleSearchClick = () => {
    onApply({
      searchText: debouncedSearch || undefined,
      referenceId: referenceId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
  };

  const handleReferenceSearch = () => {
    onApply({
      searchText: debouncedSearch || undefined,
      referenceId: referenceId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
  };

  const handleFilter = () => {
    onApply({
      searchText: debouncedSearch || undefined,
      referenceId: referenceId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setReferenceId('');
    setFromDate('');
    setToDate('');
    onReset();
  };

  return (
    <div className="space-y-3 p-4 bg-card border rounded-lg">
      {/* Top Row: Search inputs */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Left: Search text */}
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
            />
          </div>
          <Button onClick={handleSearchClick} size="sm">
            Search
          </Button>
        </div>

        {/* Right: Reference ID */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={referencePlaceholder}
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            className="w-40 sm:w-48"
            onKeyDown={(e) => e.key === 'Enter' && handleReferenceSearch()}
          />
          <Button onClick={handleReferenceSearch} size="sm">
            Search
          </Button>
        </div>
      </div>

      {/* Bottom Row: Date filters and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Date From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Date To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          <Button onClick={handleFilter} size="sm">
            <Filter className="w-4 h-4 mr-1" />
            Filter
          </Button>
          {onExport && (
            <Button onClick={onExport} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
          <Button onClick={handleReset} size="sm" variant="secondary" className="bg-teal-600 hover:bg-teal-700 text-white">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
