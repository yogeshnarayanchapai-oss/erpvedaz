import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Branding {
  id: string;
  logo_url: string | null;
  favicon_url: string | null;
  brand_name: string;
  default_theme: 'light' | 'dark';
  primary_color: string | null;
  custom_css: string | null;
  updated_at: string;
}

// Preset brand colors (HSL format without hsl() wrapper)
export const PRESET_COLORS = [
  { name: 'Blue', value: '221.2 83.2% 53.3%' },
  { name: 'Purple', value: '262.1 83.3% 57.8%' },
  { name: 'Pink', value: '330.4 81.2% 60.4%' },
  { name: 'Red', value: '0 72.2% 50.6%' },
  { name: 'Orange', value: '24.6 95% 53.1%' },
  { name: 'Yellow', value: '47.9 95.8% 53.1%' },
  { name: 'Green', value: '142.1 76.2% 36.3%' },
  { name: 'Teal', value: '173.4 80.4% 40%' },
  { name: 'Cyan', value: '189.5 94.5% 42.7%' },
  { name: 'Indigo', value: '243.4 75.4% 58.6%' },
];

// Helper to safely get store ID from localStorage (for when context is not available)
function getStoredStoreId(): string | null {
  try {
    return localStorage.getItem('currentStoreId');
  } catch {
    return null;
  }
}

export function useBranding() {
  const queryClient = useQueryClient();
  // Get store ID from localStorage as fallback when outside CurrentStoreProvider
  const storeId = getStoredStoreId();

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ['combined-branding', storeId],
    queryFn: async () => {
      // First try to get store-specific branding if we have a store
      let storeBranding = null;
      if (storeId) {
        const { data: storeData } = await supabase
          .from('branding')
          .select('*')
          .eq('store_id', storeId)
          .maybeSingle();
        
        storeBranding = storeData;
      }

      // Get system branding as fallback
      const { data: systemData, error: systemError } = await (supabase
        .from('system_branding' as any)
        .select('*')
        .single() as any);
      
      if (systemError && !storeBranding) throw systemError;
      
      const systemBranding = systemData as Branding;
      
      // Merge: store branding takes priority for logo/favicon, system for rest
      const mergedBranding: Branding = {
        id: systemBranding?.id || storeBranding?.id || '',
        // Use store logo/favicon if available, otherwise fall back to system
        logo_url: storeBranding?.logo_url || systemBranding?.logo_url || null,
        favicon_url: storeBranding?.favicon_url || systemBranding?.favicon_url || null,
        brand_name: systemBranding?.brand_name || 'ERP Software',
        default_theme: systemBranding?.default_theme || 'light',
        primary_color: systemBranding?.primary_color || null,
        custom_css: systemBranding?.custom_css || null,
        updated_at: storeBranding?.updated_at || systemBranding?.updated_at || new Date().toISOString(),
      };
      
      return mergedBranding;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Apply theme when branding loads
  useEffect(() => {
    if (branding?.default_theme) {
      const root = document.documentElement;
      if (branding.default_theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [branding?.default_theme]);

  // Apply favicon when branding loads
  useEffect(() => {
    if (branding?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = `${branding.favicon_url}?t=${Date.now()}`;
    }
  }, [branding?.favicon_url]);

  // Apply primary color when branding loads
  useEffect(() => {
    if (branding?.primary_color) {
      const root = document.documentElement;
      root.style.setProperty('--primary', branding.primary_color);
      // Also set a slightly lighter version for hover states
      root.style.setProperty('--ring', branding.primary_color);
    }
  }, [branding?.primary_color]);

  // Apply custom CSS when branding loads
  useEffect(() => {
    const styleId = 'custom-branding-css';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    
    if (branding?.custom_css) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = branding.custom_css;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [branding?.custom_css]);

  const updateBranding = useMutation({
    mutationFn: async ({ logo_url, favicon_url, brand_name, default_theme, primary_color, custom_css }: { 
      logo_url?: string | null; 
      favicon_url?: string | null;
      brand_name?: string; 
      default_theme?: 'light' | 'dark';
      primary_color?: string | null;
      custom_css?: string | null;
    }) => {
      const { data: existing } = await (supabase
        .from('system_branding' as any)
        .select('id')
        .single() as any);

      if (!existing) throw new Error('Branding record not found');

      const updateData: any = { updated_at: new Date().toISOString() };
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (favicon_url !== undefined) updateData.favicon_url = favicon_url;
      if (brand_name !== undefined) updateData.brand_name = brand_name;
      if (default_theme !== undefined) updateData.default_theme = default_theme;
      if (primary_color !== undefined) updateData.primary_color = primary_color;
      if (custom_css !== undefined) updateData.custom_css = custom_css;

      const { data, error } = await (supabase
        .from('system_branding' as any)
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as Branding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combined-branding'] });
      queryClient.invalidateQueries({ queryKey: ['system-branding'] });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logo/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('branding')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const uploadFavicon = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `favicon-${Date.now()}.${fileExt}`;
    const filePath = `favicon/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('branding')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  return {
    branding,
    isLoading,
    error,
    updateBranding,
    uploadLogo,
    uploadFavicon,
  };
}
