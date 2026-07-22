
ALTER TABLE public.logistics_settings ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.logistics_settings DROP CONSTRAINT IF EXISTS unique_courier;

DROP POLICY IF EXISTS "Admins can delete logistics settings" ON public.logistics_settings;
CREATE POLICY "Admins can delete logistics settings"
  ON public.logistics_settings
  FOR DELETE
  USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'OWNER'::public.app_role));
