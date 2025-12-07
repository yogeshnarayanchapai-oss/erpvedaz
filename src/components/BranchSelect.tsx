import { useState, useMemo } from 'react';
import { useBranches, Branch } from '@/hooks/useBranches';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, MapPin, Clock, Phone, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BranchSelectProps {
  value?: string;
  onChange: (branchId: string | undefined, branch?: Branch) => void;
  placeholder?: string;
  showDetails?: boolean;
  className?: string;
  disabled?: boolean;
}

export function BranchSelect({ 
  value, 
  onChange, 
  placeholder = "Select branch...",
  showDetails = false,
  className,
  disabled = false,
}: BranchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: branches = [], isLoading } = useBranches();

  const selectedBranch = useMemo(() => {
    return branches.find(b => b.id === value);
  }, [branches, value]);

  const filteredBranches = useMemo(() => {
    if (!search) return branches;
    const term = search.toLowerCase();
    return branches.filter(b => 
      b.branch_name.toLowerCase().includes(term) ||
      b.district?.toLowerCase().includes(term) ||
      b.province?.toLowerCase().includes(term) ||
      b.area_covered?.toLowerCase().includes(term)
    );
  }, [branches, search]);

  const handleSelect = (branch: Branch) => {
    onChange(branch.id, branch);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(undefined, undefined);
  };

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
            <span className="truncate">
              {selectedBranch 
                ? `${selectedBranch.branch_name}${selectedBranch.district ? ` – ${selectedBranch.district}` : ''}`
                : placeholder
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search branch, district, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="h-[250px]">
            <div className="p-1">
              {filteredBranches.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No branches found'}
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
          </ScrollArea>
          {value && (
            <div className="border-t p-2">
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
