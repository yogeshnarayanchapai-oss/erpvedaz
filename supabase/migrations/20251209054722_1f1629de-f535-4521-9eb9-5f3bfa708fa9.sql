
-- Create table for order copy format templates per store
CREATE TABLE public.order_copy_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  template TEXT NOT NULL DEFAULT '{{customer_name}}
{{phone}}
{{products}}
{{address}}
{{amount}}
{{branch}}
Vedaz01',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.order_copy_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Owners can manage all templates"
ON public.order_copy_templates
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'OWNER')
);

CREATE POLICY "Admins can manage their store templates"
ON public.order_copy_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.store_id = order_copy_templates.store_id
      AND usa.access_level = 'admin'
      AND usa.is_active = true
  )
);

CREATE POLICY "Staff can read their store templates"
ON public.order_copy_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.store_id = order_copy_templates.store_id
      AND usa.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_order_copy_templates_updated_at
BEFORE UPDATE ON public.order_copy_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
