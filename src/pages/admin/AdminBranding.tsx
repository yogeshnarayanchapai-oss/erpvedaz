import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useBranding, PRESET_COLORS } from '@/hooks/useBranding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image, Save, Loader2, Moon, Sun, Globe, Palette, Check, Code } from 'lucide-react';

export default function AdminBranding() {
  const { profile } = useAuth();
  const { branding, isLoading, updateBranding, uploadLogo, uploadFavicon } = useBranding();
  const [brandName, setBrandName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('221.2 83.2% 53.3%');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
  const [selectedFavicon, setSelectedFavicon] = useState<File | null>(null);
  const [customCss, setCustomCss] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Only ADMIN can access
  if (profile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  // Initialize form when branding loads
  useEffect(() => {
    if (branding && !initialized) {
      setBrandName(branding.brand_name);
      setDarkMode(branding.default_theme === 'dark');
      setPrimaryColor(branding.primary_color || '221.2 83.2% 53.3%');
      setCustomCss(branding.custom_css || '');
      setInitialized(true);
    }
  }, [branding, initialized]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPG, or SVG file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFaviconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/x-icon', 'image/ico', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, ICO, or SVG file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 500KB for favicons)
    if (file.size > 500 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a favicon smaller than 500KB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFavicon(file);
    setFaviconPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!brandName.trim()) {
      toast({
        title: 'Brand name required',
        description: 'Please enter a brand name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      let logoUrl = branding?.logo_url;
      let faviconUrl = branding?.favicon_url;

      // Upload new logo if selected
      if (selectedFile) {
        logoUrl = await uploadLogo(selectedFile);
      }

      // Upload new favicon if selected
      if (selectedFavicon) {
        faviconUrl = await uploadFavicon(selectedFavicon);
      }

      await updateBranding.mutateAsync({
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        brand_name: brandName.trim(),
        default_theme: darkMode ? 'dark' : 'light',
        primary_color: primaryColor,
        custom_css: customCss.trim() || null,
      });

      toast({
        title: 'Branding updated',
        description: 'Your changes have been saved successfully',
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedFavicon(null);
      setFaviconPreviewUrl(null);
    } catch (error: any) {
      toast({
        title: 'Error saving branding',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentLogoUrl = previewUrl || branding?.logo_url;
  const currentFaviconUrl = faviconPreviewUrl || branding?.favicon_url;
  const hasChanges = selectedFile || selectedFavicon || brandName !== branding?.brand_name || darkMode !== (branding?.default_theme === 'dark') || primaryColor !== (branding?.primary_color || '221.2 83.2% 53.3%') || customCss !== (branding?.custom_css || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Branding Settings</h1>
        <p className="text-muted-foreground">
          Manage your system logo, brand name, and theme across all portals
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>System Branding</CardTitle>
          <CardDescription>
            These settings will be applied to all portals including Admin, Calling, Follow-up, Logistics, and HRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Section */}
          <div className="space-y-4">
            <Label>System Logo</Label>
            <div className="flex items-start gap-6">
              {/* Current/Preview Logo */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                  {currentLogoUrl ? (
                    <img
                      src={`${currentLogoUrl}?t=${Date.now()}`}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Image className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {previewUrl ? 'New logo preview' : 'Current logo'}
                </span>
              </div>

              {/* Upload Button */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Logo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PNG, JPG, SVG. Max size: 2MB. Recommended: 200x200px or larger square image.
                </p>
                {selectedFile && (
                  <p className="text-xs text-primary">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Favicon Section */}
          <div className="space-y-4">
            <Label>Browser Favicon</Label>
            <div className="flex items-start gap-6">
              {/* Current/Preview Favicon */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                  {currentFaviconUrl ? (
                    <img
                      src={`${currentFaviconUrl}?t=${Date.now()}`}
                      alt="Favicon preview"
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Globe className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {faviconPreviewUrl ? 'New favicon' : 'Current'}
                </span>
              </div>

              {/* Upload Button */}
              <div className="flex-1 space-y-2">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept=".png,.ico,.svg"
                  onChange={handleFaviconSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => faviconInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Favicon
                </Button>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PNG, ICO, SVG. Max size: 500KB. Recommended: 32x32px or 16x16px.
                </p>
                {selectedFavicon && (
                  <p className="text-xs text-primary">
                    Selected: {selectedFavicon.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brand Name Section */}
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter your brand name"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              This name will appear in the sidebar, login pages, and throughout the system.
            </p>
          </div>

          {/* Dark Mode Toggle */}
          <div className="space-y-2">
            <Label>Default Theme</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
                  <p className="text-xs text-muted-foreground">
                    This theme will be applied across all portals by default
                  </p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </div>

          {/* Primary Color Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Primary Brand Color
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Select a primary color that will be used for buttons, links, and accents across all portals.
            </p>
            <div className="grid grid-cols-5 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setPrimaryColor(color.value)}
                  className={`relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                    primaryColor === color.value 
                      ? 'border-foreground ring-2 ring-offset-2 ring-offset-background' 
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: `hsl(${color.value})` }}
                  title={color.name}
                >
                  {primaryColor === color.value && (
                    <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {PRESET_COLORS.find(c => c.value === primaryColor)?.name || 'Custom'}
            </p>
          </div>

          {/* Custom CSS Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Custom CSS
            </Label>
            <Textarea
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder={`/* Add custom CSS here */\n.my-class {\n  color: red;\n}`}
              className="font-mono text-sm min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground">
              Add custom CSS that will be injected across all portals. Use with caution.
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            How your branding will appear across portals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${darkMode ? 'bg-zinc-900 text-white' : 'bg-sidebar'}`}>
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              {currentLogoUrl ? (
                <img
                  src={`${currentLogoUrl}?t=${Date.now()}`}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">
                    {brandName.charAt(0).toUpperCase() || 'V'}
                  </span>
                </div>
              )}
            </div>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-sidebar-foreground'}`}>
              {brandName || 'Zivkart OS'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
