import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StoreBranding {
  id: string;
  store_id: string;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  announcement_text: string | null;
  whatsapp_number: string | null;
  facebook_pixel: string | null;
  google_analytics: string | null;
  site_under_construction: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useStoreBranding(storeId: string) {
  return useQuery({
    queryKey: ['store-branding', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branding')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) throw error;
      return data as StoreBranding | null;
    },
    enabled: !!storeId,
  });
}

export function useUpsertStoreBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, ...data }: Partial<StoreBranding> & { storeId: string }) => {
      // Check if branding record exists
      const { data: existing } = await supabase
        .from('branding')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('branding')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('store_id', storeId)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from('branding')
          .insert({ store_id: storeId, ...data })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['store-branding', variables.storeId] });
      toast.success('Branding updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update branding: ${error.message}`);
    },
  });
}

export async function uploadStoreLogo(storeId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${storeId}/logo-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function uploadStoreFavicon(storeId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${storeId}/favicon-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function uploadStoreBanner(storeId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${storeId}/banner-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
