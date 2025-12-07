import { Bell, Check, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const typeIcons: Record<string, string> = {
  LEAD_TRANSFER: '📋',
  ORDER_CONFIRMED: '✅',
  ORDER_REDIRECTED: '↩️',
  DELIVERY_UPDATED: '🚚',
  LEAD_CNR: '📵',
  LEAD_FOLLOWUP: '🔄',
  LEAD_CANCELLED: '❌',
  LOGISTICS_EXPORTED: '📦',
  SYSTEM: '🔔',
};

const typeColors: Record<string, string> = {
  LEAD_TRANSFER: 'bg-blue-100 text-blue-700',
  ORDER_CONFIRMED: 'bg-green-100 text-green-700',
  ORDER_REDIRECTED: 'bg-orange-100 text-orange-700',
  DELIVERY_UPDATED: 'bg-purple-100 text-purple-700',
  LEAD_CNR: 'bg-yellow-100 text-yellow-700',
  LEAD_FOLLOWUP: 'bg-cyan-100 text-cyan-700',
  LEAD_CANCELLED: 'bg-red-100 text-red-700',
  LOGISTICS_EXPORTED: 'bg-indigo-100 text-indigo-700',
  SYSTEM: 'bg-gray-100 text-gray-700',
};

function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onClick: () => void;
}) {
  const isUnread = !notification.read_at;
  const icon = typeIcons[notification.type] || '🔔';
  const colorClass = typeColors[notification.type] || typeColors.SYSTEM;

  return (
    <div
      className={cn(
        'p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors',
        isUnread && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm',
              colorClass
            )}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm truncate',
                isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
              )}
            >
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
              {notification.actor_name && (
                <p className="text-xs text-muted-foreground">
                  by {notification.actor_name}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {notification.link_path && (
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          )}
          {isUnread && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
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
    </div>
  );
}

interface UnifiedNotificationBellProps {
  showViewAll?: boolean;
  viewAllPath?: string;
}

export function UnifiedNotificationBell({ 
  showViewAll = true, 
  viewAllPath = '/admin/notifications' 
}: UnifiedNotificationBellProps) {
  const navigate = useNavigate();
  const {
    latestNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link_path) {
      navigate(notification.link_path);
    }
  };

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
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[340px]">
          {latestNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            latestNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2 flex gap-2">
          {showViewAll && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-center text-xs"
              onClick={() => navigate(viewAllPath)}
            >
              View all notifications
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="justify-center text-xs"
            onClick={() => navigate('/settings/notifications')}
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
