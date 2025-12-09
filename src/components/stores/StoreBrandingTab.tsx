import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2 } from 'lucide-react';
import { useStoreBranding, useUpsertStoreBranding, uploadStoreLogo, uploadStoreFavicon, uploadStoreBanner } from '@/hooks/useStoreBranding';
import { toast } from 'sonner';

interface StoreBrandingTabProps {
  storeId: string;
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
];

export function StoreBrandingTab({ storeId }: StoreBrandingTabProps) {
  const { data: branding, isLoading } = useStoreBranding(storeId);
  const updateBranding = useUpsertStoreBranding();

  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#6366F1');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [announcementText, setAnnouncementText] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [facebookPixel, setFacebookPixel] = useState('');
  const [googleAnalytics, setGoogleAnalytics] = useState('');
  const [siteUnderConstruction, setSiteUnderConstruction] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Sync state when branding loads
  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primary_color || '#3B82F6');
      setSecondaryColor(branding.secondary_color || '#6366F1');
      setFontFamily(branding.font_family || 'Inter');
      setAnnouncementText(branding.announcement_text || '');
      setWhatsappNumber(branding.whatsapp_number || '');
      setFacebookPixel(branding.facebook_pixel || '');
      setGoogleAnalytics(branding.google_analytics || '');
      setSiteUnderConstruction(branding.site_under_construction || false);
    }
  }, [branding]);

  const handleSave = async () => {
    await updateBranding.mutateAsync({
      storeId,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      font_family: fontFamily,
      announcement_text: announcementText,
      whatsapp_number: whatsappNumber,
      facebook_pixel: facebookPixel,
      google_analytics: googleAnalytics,
      site_under_construction: siteUnderConstruction,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading('logo');
      const logoUrl = await uploadStoreLogo(storeId, file);
      await updateBranding.mutateAsync({ storeId, logo_url: logoUrl });
    } catch (error: any) {
      toast.error(`Failed to upload logo: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading('favicon');
      const faviconUrl = await uploadStoreFavicon(storeId, file);
      await updateBranding.mutateAsync({ storeId, favicon_url: faviconUrl });
    } catch (error: any) {
      toast.error(`Failed to upload favicon: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading('banner');
      const bannerUrl = await uploadStoreBanner(storeId, file);
      await updateBranding.mutateAsync({ storeId, banner_url: bannerUrl });
    } catch (error: any) {
      toast.error(`Failed to upload banner: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo, Favicon, Banner */}
      <Card>
        <CardHeader>
          <CardTitle>Store Assets</CardTitle>
          <CardDescription>Upload logo, favicon and banner images</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-2" />
              ) : (
                <div className="w-24 h-24 bg-muted rounded mx-auto mb-2 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading === 'logo'}>
                  <span>
                    {uploading === 'logo' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Logo
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {branding?.favicon_url ? (
                <img src={branding.favicon_url} alt="Favicon" className="w-16 h-16 object-contain mx-auto mb-2" />
              ) : (
                <div className="w-16 h-16 bg-muted rounded mx-auto mb-2 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading === 'favicon'}>
                  <span>
                    {uploading === 'favicon' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Favicon
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
              </label>
            </div>
          </div>

          {/* Banner */}
          <div className="space-y-2">
            <Label>Banner</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {branding?.banner_url ? (
                <img src={branding.banner_url} alt="Banner" className="w-full h-16 object-cover mx-auto mb-2 rounded" />
              ) : (
                <div className="w-full h-16 bg-muted rounded mx-auto mb-2 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading === 'banner'}>
                  <span>
                    {uploading === 'banner' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Banner
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>Set your store's primary and secondary colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setPrimaryColor(color.value)}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground transition-colors"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Font Family</Label>
            <Input
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder="Inter, sans-serif"
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Store Settings</CardTitle>
          <CardDescription>Configure announcements and integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Announcement Text</Label>
            <Textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Special offer! Free shipping on orders above Rs 1000"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+977 98XXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label>Facebook Pixel ID</Label>
              <Input
                value={facebookPixel}
                onChange={(e) => setFacebookPixel(e.target.value)}
                placeholder="XXXXXXXXXXXXXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Google Analytics ID</Label>
            <Input
              value={googleAnalytics}
              onChange={(e) => setGoogleAnalytics(e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label>Site Under Construction</Label>
              <p className="text-sm text-muted-foreground">Show a maintenance page instead of the storefront</p>
            </div>
            <Switch
              checked={siteUnderConstruction}
              onCheckedChange={setSiteUnderConstruction}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateBranding.isPending}>
          {updateBranding.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
