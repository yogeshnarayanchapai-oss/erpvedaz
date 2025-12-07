import { Bell, Check, Trash2, Phone, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLeadNotifications, LeadNotification } from '@/hooks/useLeadNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

function NotificationItem({ 
  notification, 
  onMarkRead,
  onClick,
}: { 
  notification: LeadNotification;
  onMarkRead: () => void;
  onClick: () => void;
}) {
  return (
    <div 
      className={cn(
        "p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors",
        !notification.read && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
            notification.read ? "bg-muted" : "bg-primary/10"
          )}>
            <Phone className={cn(
              "w-4 h-4",
              notification.read ? "text-muted-foreground" : "text-primary"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate",
              !notification.read && "text-foreground"
            )}>
              {notification.clientName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {notification.contactNumber}
              {notification.productName && ` · ${notification.productName}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    clearNotifications,
  } = useLeadNotifications(profile?.id);

  // Only show for CALLING role users
  if (profile?.role !== 'CALLING') {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Lead Assignments</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={clearNotifications}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[280px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-xs mt-1">You'll see new lead assignments here</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onClick={() => {
                  markAsRead(notification.id);
                  navigate('/calling/leads');
                }}
              />
            ))
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => navigate('/settings/notifications')}
          >
            <Settings className="h-3 w-3 mr-2" />
            Notification Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
