
-- Create table to store SocialBox API configuration per store
CREATE TABLE public.socialbox_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  api_token TEXT NOT NULL,
  api_base_url TEXT NOT NULL DEFAULT 'https://jsepesypdjxkdotqphxo.supabase.co/functions/v1/leads-api',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.socialbox_config ENABLE ROW LEVEL SECURITY;

-- Only OWNER/ADMIN can manage SocialBox config
CREATE POLICY "Users with store access can view socialbox config"
  ON public.socialbox_config FOR SELECT
  USING (public.user_has_store_access(auth.uid(), store_id));

CREATE POLICY "Store admins can insert socialbox config"
  ON public.socialbox_config FOR INSERT
  WITH CHECK (public.is_store_admin(auth.uid(), store_id));

CREATE POLICY "Store admins can update socialbox config"
  ON public.socialbox_config FOR UPDATE
  USING (public.is_store_admin(auth.uid(), store_id));

CREATE POLICY "Store admins can delete socialbox config"
  ON public.socialbox_config FOR DELETE
  USING (public.is_store_admin(auth.uid(), store_id));

-- Trigger for updated_at
CREATE TRIGGER update_socialbox_config_updated_at
  BEFORE UPDATE ON public.socialbox_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
