import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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
import { usePartiesWithBalances, PartyWithBalances } from '@/hooks/useParties';
import { AddPartyDialog } from './AddPartyDialog';

interface SearchablePartySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  partyType?: 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
  showNoneOption?: boolean;
  showAddButton?: boolean;
}

export function SearchablePartySelect({
  value,
  onValueChange,
  placeholder = 'Select party...',
  disabled = false,
  partyType,
  showNoneOption = false,
  showAddButton = true,
}: SearchablePartySelectProps) {
  const [open, setOpen] = useState(false);
  const { data: allParties = [] } = usePartiesWithBalances(partyType);

  const parties = useMemo(() => {
    return allParties;
  }, [allParties]);

  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === value);
  }, [parties, value]);

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
          >
            {value === 'none' ? 'None' : selectedParty ? selectedParty.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search party..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No party found.</CommandEmpty>
              <CommandGroup>
                {showNoneOption && (
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onValueChange('none');
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === 'none' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="text-muted-foreground">None</span>
                  </CommandItem>
                )}
                {parties.map((party) => (
                  <CommandItem
                    key={party.id}
                    value={party.name}
                    onSelect={() => {
                      onValueChange(party.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === party.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{party.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {party.party_type} {party.phone ? `• ${party.phone}` : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showAddButton && (
        <AddPartyDialog
          trigger={
            <Button variant="outline" size="icon" type="button">
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
      )}
    </div>
  );
}
