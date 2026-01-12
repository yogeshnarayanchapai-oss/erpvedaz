import React, { ReactNode, useState } from 'react';
import { Filter, X, ChevronUp, ChevronDown } from 'lucide-react';
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MobileFilterDrawer({
  children,
  activeFiltersCount = 0,
  onClear,
  onApply,
  title = 'Filters',
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: MobileFilterDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 md:hidden h-9', className)}
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
      <DrawerContent className="max-h-[85vh] flex flex-col">
        {/* Sticky header */}
        <DrawerHeader className="sticky top-0 z-10 bg-background border-b border-border pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <DrawerTitle className="text-lg">{title}</DrawerTitle>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth-touch">
          {children}
        </div>
        
        {/* Sticky footer */}
        <DrawerFooter className="sticky bottom-0 z-10 bg-background border-t border-border pt-3 pb-4 safe-bottom shrink-0">
          <div className="flex gap-3">
            {onClear && (
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear All
              </Button>
            )}
            <Button
              className="flex-1 h-11"
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
  defaultExpanded?: boolean;
}

export function MobileFilterToggle({
  children,
  activeFiltersCount = 0,
  className,
  defaultExpanded = false,
}: MobileFilterToggleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('md:hidden', className)}>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between gap-2 mb-2 h-9"
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
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      {expanded && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg mb-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// Desktop filter wrapper that shows on larger screens
interface DesktopFilterProps {
  children: ReactNode;
  className?: string;
}

export function DesktopFilter({ children, className }: DesktopFilterProps) {
  return (
    <div className={cn('hidden md:block', className)}>
      {children}
    </div>
  );
}
