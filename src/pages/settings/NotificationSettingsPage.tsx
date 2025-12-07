import { NotificationSettings } from '@/components/notifications/NotificationSettings';

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your notification preferences</p>
      </div>
      <div className="max-w-2xl">
        <NotificationSettings />
      </div>
    </div>
  );
}
