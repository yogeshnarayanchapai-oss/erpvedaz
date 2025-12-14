import { ReactNode } from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backButton?: ReactNode;
  menuItems?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  }[];
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  actions,
  backButton,
  menuItems,
  className,
}: MobileHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2 mb-4', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {backButton}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        
        {menuItems && menuItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((item, index) => (
                <DropdownMenuItem key={index} onClick={item.onClick}>
                  {item.icon}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Page header with search and actions
interface MobilePageHeaderProps {
  title: string;
  searchComponent?: ReactNode;
  filterComponent?: ReactNode;
  actionButton?: ReactNode;
  className?: string;
}

export function MobilePageHeader({
  title,
  searchComponent,
  filterComponent,
  actionButton,
  className,
}: MobilePageHeaderProps) {
  return (
    <div className={cn('space-y-3 mb-4', className)}>
      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {actionButton}
      </div>
      
      {/* Search and filter row */}
      {(searchComponent || filterComponent) && (
        <div className="flex items-center gap-2">
          {searchComponent && (
            <div className="flex-1 min-w-0">{searchComponent}</div>
          )}
          {filterComponent}
        </div>
      )}
    </div>
  );
}
