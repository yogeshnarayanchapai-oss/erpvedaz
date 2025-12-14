import { ReactNode, useState } from 'react';
import { Filter, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileFilterDrawerProps {
  children: ReactNode;
  activeFiltersCount?: number;
  onClear?: () => void;
  onApply?: () => void;
  title?: string;
  className?: string;
}

export function MobileFilterDrawer({
  children,
  activeFiltersCount = 0,
  onClear,
  onApply,
  title = 'Filters',
  className,
}: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 md:hidden', className)}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>
        
        <DrawerFooter className="border-t border-border pt-4">
          <div className="flex gap-2">
            {onClear && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear All
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => {
                onApply?.();
                setOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Inline filter toggle for mobile - collapses filters
interface MobileFilterToggleProps {
  children: ReactNode;
  activeFiltersCount?: number;
  className?: string;
}

export function MobileFilterToggle({
  children,
  activeFiltersCount = 0,
  className,
}: MobileFilterToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('md:hidden', className)}>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between gap-2 mb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <ChevronUp
          className={cn(
            'h-4 w-4 transition-transform',
            !expanded && 'rotate-180'
          )}
        />
      </Button>
      {expanded && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg mb-4">
          {children}
        </div>
      )}
    </div>
  );
}
