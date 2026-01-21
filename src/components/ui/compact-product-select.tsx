import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

interface Product {
  id: string;
  name: string;
  is_active?: boolean;
}

interface CompactProductSelectProps {
  products: Product[];
  value: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filterActive?: boolean;
}

export function CompactProductSelect({
  products,
  value,
  onSelect,
  placeholder = 'Select product',
  disabled = false,
  className,
  filterActive = true,
}: CompactProductSelectProps) {
  const [open, setOpen] = useState(false);

  const filteredProducts = filterActive 
    ? products.filter(p => p.is_active !== false) 
    : products;
  
  const selectedProduct = products.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 justify-between font-normal text-sm w-full',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[250px] p-0 z-50 bg-popover border shadow-lg" 
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search products..." className="h-9" />
          <CommandList className="max-h-[45vh] sm:max-h-[300px] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelect(product.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-3 w-3',
                      value === product.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{product.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
