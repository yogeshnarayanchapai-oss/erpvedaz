-- Create ad_spend_reference table for daily reference spend tracking
CREATE TABLE public.ad_spend_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one row per store/product/date
  CONSTRAINT unique_store_product_date UNIQUE (store_id, product_id, spend_date)
);

-- Create indexes for performance
CREATE INDEX idx_ad_spend_reference_store_id ON public.ad_spend_reference(store_id);
CREATE INDEX idx_ad_spend_reference_product_id ON public.ad_spend_reference(product_id);
CREATE INDEX idx_ad_spend_reference_spend_date ON public.ad_spend_reference(spend_date);
CREATE INDEX idx_ad_spend_reference_store_date ON public.ad_spend_reference(store_id, spend_date);

-- Enable RLS
ALTER TABLE public.ad_spend_reference ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- OWNER can view all
CREATE POLICY "OWNER can view all ad spend reference"
ON public.ad_spend_reference
FOR SELECT
USING (has_role(auth.uid(), 'OWNER'::app_role));

-- OWNER can manage all
CREATE POLICY "OWNER can manage all ad spend reference"
ON public.ad_spend_reference
FOR ALL
USING (has_role(auth.uid(), 'OWNER'::app_role));

-- ADMIN and MARKETING can view their store's data
CREATE POLICY "ADMIN and MARKETING can view store ad spend reference"
ON public.ad_spend_reference
FOR SELECT
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'MARKETING'::app_role))
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
);

-- ADMIN can manage their store's data (any date)
CREATE POLICY "ADMIN can manage store ad spend reference"
ON public.ad_spend_reference
FOR ALL
USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
);

-- MARKETING can insert for their store
CREATE POLICY "MARKETING can insert store ad spend reference"
ON public.ad_spend_reference
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'MARKETING'::app_role)
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
);

-- MARKETING can update their store's data (last 7 days only)
CREATE POLICY "MARKETING can update recent store ad spend reference"
ON public.ad_spend_reference
FOR UPDATE
USING (
  has_role(auth.uid(), 'MARKETING'::app_role)
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
  AND spend_date >= CURRENT_DATE - INTERVAL '7 days'
);

-- MARKETING can delete their store's data (last 7 days only)
CREATE POLICY "MARKETING can delete recent store ad spend reference"
ON public.ad_spend_reference
FOR DELETE
USING (
  has_role(auth.uid(), 'MARKETING'::app_role)
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
  AND spend_date >= CURRENT_DATE - INTERVAL '7 days'
);

-- Trigger for updated_at
CREATE TRIGGER update_ad_spend_reference_updated_at
BEFORE UPDATE ON public.ad_spend_reference
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();