import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Check, ExternalLink } from 'lucide-react';
import { useSocialBoxConfig, useSaveSocialBoxConfig } from '@/hooks/useSocialBoxLeads';

export default function SocialBoxSettingsTab() {
  const { data: config, isLoading } = useSocialBoxConfig();
  const saveConfig = useSaveSocialBoxConfig();
  const [apiToken, setApiToken] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  useEffect(() => {
    if (config) {
      setApiToken(config.api_token || '');
      setApiBaseUrl(config.api_base_url || '');
    }
  }, [config]);

  const handleSave = () => {
    if (!apiToken.trim()) return;
    saveConfig.mutate({ apiToken: apiToken.trim(), apiBaseUrl: apiBaseUrl.trim() || undefined });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                SocialBox API Connection
              </CardTitle>
              <CardDescription>
                Connect your SocialBox account to automatically pull leads from Facebook, Instagram, and other social media platforms.
              </CardDescription>
            </div>
            {config?.is_active && (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 bg-muted/30">
            <h4 className="font-medium text-sm mb-2">कसरी Token पाउने?</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>SocialBox मा Login गर्नुहोस्</li>
              <li>Browser console मा <code className="bg-muted px-1 rounded text-xs">supabase.auth.getSession()</code> बाट access_token लिनुहोस्</li>
              <li>Token यहाँ paste गर्नुहोस्</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-token">API Token (Bearer Token)</Label>
            <Input
              id="api-token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Enter your SocialBox API token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <Input
              id="api-url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://jsepesypdjxkdotqphxo.supabase.co/functions/v1/leads-api"
            />
            <p className="text-xs text-muted-foreground">Default URL is pre-configured. Only change if you have a custom endpoint.</p>
          </div>

          {config?.last_synced_at && (
            <p className="text-xs text-muted-foreground">
              Last synced: {new Date(config.last_synced_at).toLocaleString()}
            </p>
          )}

          <Button onClick={handleSave} disabled={saveConfig.isPending || !apiToken.trim()}>
            {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {config ? 'Update Connection' : 'Connect SocialBox'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
