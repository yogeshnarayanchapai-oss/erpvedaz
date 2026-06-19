import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ConsignmentPicker({
  value,
  onValueChange,
  placeholder = 'Select consignment (optional)...',
  disabled,
}: ConsignmentPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useConsignmentOptions();

  const selected = useMemo(
    () => items.find((c) => c.id === value),
    [items, value]
  );

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal"
            disabled={disabled}
            type="button"
          >
            {selected ? (
              <span className="truncate">
                {selected.consignment_code}
                {selected.is_completed ? ' • Completed' : ''}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
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
                {items.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.consignment_code} ${c.product_name ?? ''} ${c.customer_name ?? ''}`}
                    onSelect={() => {
                      onValueChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === c.id ? 'opacity-100' : 'opacity-0'
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
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          variant="outline"
          size="icon"
          type="button"
          onClick={() => onValueChange(null)}
          title="Clear"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
