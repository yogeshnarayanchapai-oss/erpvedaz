import { Bell, Volume2, Mail, MessageSquare, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function NotificationSettings() {
  const { profile } = useAuth();
  const { 
    preferences, 
    browserPermission, 
    browserSupported,
    toggleSound, 
    toggleToast, 
    toggleEmail,
    toggleBrowser,
  } = useNotificationPreferences(profile?.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Customize how you receive notifications for new lead assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="sound-toggle" className="text-sm font-medium">
                Sound Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Play a sound when new leads are assigned
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={preferences.soundEnabled}
            onCheckedChange={toggleSound}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="toast-toggle" className="text-sm font-medium">
                Toast Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Show popup notifications in the app
              </p>
            </div>
          </div>
          <Switch
            id="toast-toggle"
            checked={preferences.toastEnabled}
            onCheckedChange={toggleToast}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              browserSupported ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Globe className={`h-5 w-5 ${browserSupported ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="browser-toggle" className={`text-sm font-medium ${!browserSupported ? 'text-muted-foreground' : ''}`}>
                  Browser Notifications
                </Label>
                {browserPermission === 'denied' && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Blocked</Badge>
                )}
                {browserPermission === 'granted' && preferences.browserEnabled && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-500">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {!browserSupported 
                  ? 'Your browser does not support notifications'
                  : browserPermission === 'denied'
                  ? 'Enable notifications in browser settings to use this feature'
                  : 'Get alerts even when the tab is in background'}
              </p>
            </div>
          </div>
          <Switch
            id="browser-toggle"
            checked={preferences.browserEnabled}
            onCheckedChange={toggleBrowser}
            disabled={!browserSupported || browserPermission === 'denied'}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="email-toggle" className="text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Send email alerts for attendance check-in/check-out
              </p>
            </div>
          </div>
          <Switch
            id="email-toggle"
            checked={preferences.emailEnabled}
            onCheckedChange={toggleEmail}
          />
        </div>
      </CardContent>
    </Card>
  );
}
