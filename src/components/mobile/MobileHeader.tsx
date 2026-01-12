import React, { ReactNode } from 'react';
import { Menu, ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  separator?: boolean;
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backButton?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  backPath?: string;
  menuItems?: MenuItem[];
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  actions,
  backButton,
  showBack = false,
  onBack,
  backPath,
  menuItems,
  className,
}: MobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-between gap-2 mb-4',
      'md:mb-6',
      className
    )}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {backButton}
        {showBack && !backButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 -ml-1"
            onClick={handleBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        
        {menuItems && menuItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {menuItems.map((item, index) => (
                <React.Fragment key={index}>
                  {item.separator && index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    onClick={item.onClick}
                    className={cn(
                      "gap-2",
                      item.destructive && "text-destructive focus:text-destructive"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Page header with search and actions - responsive version
interface ResponsivePageHeaderProps {
  title: string;
  subtitle?: string;
  searchComponent?: ReactNode;
  filterComponent?: ReactNode;
  actionButton?: ReactNode;
  className?: string;
  mobileFilterDrawer?: ReactNode;
}

export function ResponsivePageHeader({
  title,
  subtitle,
  searchComponent,
  filterComponent,
  actionButton,
  className,
  mobileFilterDrawer,
}: ResponsivePageHeaderProps) {
  return (
    <div className={cn('space-y-3 mb-4 md:mb-6', className)}>
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actionButton && (
          <div className="shrink-0">{actionButton}</div>
        )}
      </div>
      
      {/* Search and filter row */}
      {(searchComponent || filterComponent || mobileFilterDrawer) && (
        <div className="flex items-center gap-2 flex-wrap">
          {searchComponent && (
            <div className="flex-1 min-w-[200px] max-w-md">{searchComponent}</div>
          )}
          {/* Mobile filter drawer */}
          {mobileFilterDrawer}
          {/* Desktop filters */}
          {filterComponent && (
            <div className="hidden md:flex items-center gap-2">{filterComponent}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Sticky mobile header for detail pages
interface StickyMobileHeaderProps {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function StickyMobileHeader({
  title,
  onBack,
  actions,
  className,
}: StickyMobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn(
      'sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b',
      'px-3 py-2.5 safe-top',
      'md:hidden',
      className
    )}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 -ml-1"
          onClick={handleBack}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-base truncate flex-1">{title}</h1>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
