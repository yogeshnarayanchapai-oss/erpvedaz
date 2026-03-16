import { useState, useMemo, useRef, useEffect } from 'react';
import { useBranches, Branch } from '@/hooks/useBranches';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Check, ChevronsUpDown, MapPin, Clock, Phone, DollarSign, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

interface BranchSelectProps {
  value?: string;
  customValue?: string;
  onChange: (branchId: string | undefined, branch?: Branch, customName?: string) => void;
  placeholder?: string;
  showDetails?: boolean;
  className?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

export function BranchSelect({ 
  value, 
  customValue,
  onChange, 
  placeholder = "Select branch...",
  showDetails = false,
  className,
  disabled = false,
  allowCustom = true,
}: BranchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { effectiveRole } = useEffectiveRole();
  
  const canAddCustomBranch = allowCustom && ['OWNER', 'ADMIN', 'MANAGER'].includes(effectiveRole);
  
  const { data: branches = [], isLoading } = useBranches();

  const selectedBranch = useMemo(() => {
    return branches.find(b => b.id === value);
  }, [branches, value]);

  const filteredBranches = useMemo(() => {
    if (!search) return branches;
    const term = search.toLowerCase();
    const filtered = branches.filter(b => 
      b.branch_name.toLowerCase().includes(term) ||
      b.district?.toLowerCase().includes(term) ||
      b.province?.toLowerCase().includes(term) ||
      b.area_covered?.toLowerCase().includes(term)
    );
    
    // Sort: exact match first, then starts-with, then contains
    return filtered.sort((a, b) => {
      const aName = a.branch_name.toLowerCase();
      const bName = b.branch_name.toLowerCase();
      
      // Exact match gets highest priority
      if (aName === term && bName !== term) return -1;
      if (bName === term && aName !== term) return 1;
      
      // Starts-with gets second priority
      const aStarts = aName.startsWith(term);
      const bStarts = bName.startsWith(term);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      // Then alphabetical
      return aName.localeCompare(bName);
    });
  }, [branches, search]);

  // Check if search matches any existing branch exactly
  const hasExactMatch = useMemo(() => {
    if (!search) return false;
    return branches.some(b => b.branch_name.toLowerCase() === search.toLowerCase());
  }, [branches, search]);

  const handleSelect = (branch: Branch) => {
    onChange(branch.id, branch, undefined);
    setOpen(false);
    setSearch('');
  };

  const handleCustomSelect = () => {
    if (search.trim()) {
      onChange(undefined, undefined, search.trim());
      setOpen(false);
      setSearch('');
    }
  };

  const handleClear = () => {
    onChange(undefined, undefined, undefined);
  };

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const displayValue = useMemo(() => {
    if (selectedBranch) {
      return `${selectedBranch.branch_name}${selectedBranch.district ? ` – ${selectedBranch.district}` : ''}`;
    }
    if (customValue) {
      return customValue;
    }
    return placeholder;
  }, [selectedBranch, customValue, placeholder]);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            <span className={cn("truncate", !selectedBranch && !customValue && "text-muted-foreground")}>
              {displayValue}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 bg-popover" align="start">
          <div className="p-2 border-b border-border">
            <Input
              ref={inputRef}
              placeholder="Type to search or enter custom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && allowCustom && search.trim() && !hasExactMatch) {
                  e.preventDefault();
                  handleCustomSelect();
                }
              }}
              className="h-9"
            />
          </div>
          <div className="h-[250px] overflow-y-auto overscroll-contain p-1">
              {/* Custom entry option */}
              {allowCustom && search.trim() && !hasExactMatch && (
                <button
                  onClick={handleCustomSelect}
                  className="flex items-center gap-2 w-full rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border mb-1"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Use "<strong>{search.trim()}</strong>" as custom branch</span>
                </button>
              )}
              
              {filteredBranches.length === 0 && !search.trim() ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No branches found'}
                </div>
              ) : filteredBranches.length === 0 && search.trim() && !allowCustom ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No matching branches
                </div>
              ) : (
                filteredBranches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleSelect(branch)}
                    className={cn(
                      "flex items-start gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                      value === branch.id && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        value === branch.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{branch.branch_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[branch.district, branch.province].filter(Boolean).join(', ') || 'No location'}
                      </div>
                    </div>
                    {branch.arrival_time && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {branch.arrival_time}
                      </span>
                    )}
                  </button>
                ))
              )}
          </div>
          {(value || customValue) && (
            <div className="border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleClear}
              >
                Clear selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Branch Details Display */}
      {showDetails && selectedBranch && (
        <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-sm">
          {selectedBranch.arrival_time && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Arrival: {selectedBranch.arrival_time}</span>
            </div>
          )}
          {selectedBranch.contact_phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>Contact: {selectedBranch.contact_phone}</span>
              {selectedBranch.contact_name && (
                <span className="text-xs">({selectedBranch.contact_name})</span>
              )}
            </div>
          )}
          {selectedBranch.base_charge !== null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Base Charge: ₹{selectedBranch.base_charge}</span>
            </div>
          )}
          {selectedBranch.area_covered && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">Areas: {selectedBranch.area_covered}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
