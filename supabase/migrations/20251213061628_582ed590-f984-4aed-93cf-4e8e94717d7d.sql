-- Create RTO settings table for monthly RTO percentage configuration
CREATE TABLE IF NOT EXISTS public.rto_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES public.stores(id),
  year_month text NOT NULL, -- format: 'YYYY-MM'
  rto_percent numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(store_id, year_month)
);

-- Enable RLS
ALTER TABLE public.rto_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view RTO settings for their stores"
ON public.rto_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  has_role(auth.uid(), 'ACCOUNTANT'::app_role)
);

CREATE POLICY "OWNER and ADMIN can manage RTO settings"
ON public.rto_settings
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR
  has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_rto_settings_updated_at
BEFORE UPDATE ON public.rto_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();