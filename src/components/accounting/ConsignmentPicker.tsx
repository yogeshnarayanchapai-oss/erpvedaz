import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useConsignmentOptions } from '@/hooks/useConsignmentOptions';

interface ConsignmentPickerProps {
  // Multi-select API (preferred)
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  // Legacy single-select API (still supported)
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ConsignmentPicker({
  values,
  onValuesChange,
  value,
  onValueChange,
  placeholder = 'Select consignment (optional)...',
  disabled,
}: ConsignmentPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useConsignmentOptions();

  // Normalize to multi-select internally
  const isMulti = values !== undefined || onValuesChange !== undefined;
  const selectedIds: string[] = isMulti
    ? values ?? []
    : value
      ? [value]
      : [];

  const emit = (next: string[]) => {
    if (isMulti) {
      onValuesChange?.(next);
    } else {
      onValueChange?.(next[0] ?? null);
    }
  };

  const selectedItems = useMemo(
    () => selectedIds.map((id) => items.find((c) => c.id === id)).filter(Boolean) as typeof items,
    [items, selectedIds]
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      emit(selectedIds.filter((x) => x !== id));
    } else {
      emit([...selectedIds, id]);
    }
  };

  const remove = (id: string) => emit(selectedIds.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
              <span className="truncate max-w-[180px]">{c.consignment_code}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="rounded hover:bg-muted-foreground/20 p-0.5"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
            type="button"
          >
            <span className="text-muted-foreground truncate">
              {selectedItems.length > 0
                ? `Add another consignment...`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command
            filter={(value, search) =>
              value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search consignment code..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No consignment found.</CommandEmpty>
              <CommandGroup>
                {items.map((c) => {
                  const checked = selectedIds.includes(c.id);
                  return (
                    <CommandItem
                      key={c.id}
                      value={`${c.consignment_code} ${c.product_name ?? ''} ${c.customer_name ?? ''}`}
                      onSelect={() => {
                        toggle(c.id);
                        // Keep popover open in multi mode so user can add more
                        if (!isMulti) setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          checked ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {c.consignment_code}
                          {c.is_completed && (
                            <span className="ml-2 text-xs text-muted-foreground">(Completed)</span>
                          )}
                        </span>
                        {(c.product_name || c.customer_name) && (
                          <span className="text-xs text-muted-foreground">
                            {[c.product_name, c.customer_name].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
