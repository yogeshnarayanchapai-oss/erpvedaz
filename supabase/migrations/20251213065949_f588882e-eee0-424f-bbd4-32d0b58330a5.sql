-- Create daily_records table for storing Daily P/L records with all calculated fields
CREATE TABLE public.daily_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  record_date DATE NOT NULL,
  
  -- Core metrics
  sell NUMERIC NOT NULL DEFAULT 0, -- total OUT from warehouse (stock movement)
  ads_spent_npr NUMERIC NOT NULL DEFAULT 0, -- from Ad Spend Records
  rto NUMERIC NOT NULL DEFAULT 0, -- Sell × RTO% (monthly)
  rto_cost NUMERIC NOT NULL DEFAULT 0, -- RTO × 200
  staff_office_cost NUMERIC NOT NULL DEFAULT 0, -- (VD + OVD total orders) × 50
  actual_sell NUMERIC NOT NULL DEFAULT 0, -- Sell − RTO
  product_cost NUMERIC NOT NULL DEFAULT 0, -- actual cost from stock movement OUT
  actual_product_cost NUMERIC NOT NULL DEFAULT 0, -- Product Cost − (Product Cost × RTO%)
  product_value NUMERIC NOT NULL DEFAULT 0, -- from product daybook
  delivery_charge NUMERIC NOT NULL DEFAULT 0, -- (VD + OVD total orders) × 250
  redirect_cost NUMERIC NOT NULL DEFAULT 0, -- Sell × 20% × 50
  actual_product_value NUMERIC NOT NULL DEFAULT 0, -- total value from stock movement OUT
  profit_loss NUMERIC NOT NULL DEFAULT 0, -- P/L calculation
  
  -- Additional reference fields
  rto_percent NUMERIC NOT NULL DEFAULT 0, -- The RTO % used for calculation
  total_orders INTEGER NOT NULL DEFAULT 0, -- VD + OVD orders count
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate records for same date/store/warehouse
CREATE UNIQUE INDEX daily_records_unique_idx ON public.daily_records(store_id, warehouse_id, record_date) 
  WHERE warehouse_id IS NOT NULL;
CREATE UNIQUE INDEX daily_records_unique_no_warehouse_idx ON public.daily_records(store_id, record_date) 
  WHERE warehouse_id IS NULL;

-- Create index for efficient querying
CREATE INDEX daily_records_store_date_idx ON public.daily_records(store_id, record_date DESC);
CREATE INDEX daily_records_warehouse_idx ON public.daily_records(warehouse_id);

-- Enable RLS
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_records
CREATE POLICY "Users can view their store daily records" 
  ON public.daily_records 
  FOR SELECT 
  USING (store_id IN (SELECT get_user_store_ids(auth.uid())));

CREATE POLICY "OWNER, ADMIN, ACCOUNTANT, MANAGER can insert daily records"
  ON public.daily_records
  FOR INSERT
  WITH CHECK (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
    AND (
      has_role(auth.uid(), 'OWNER'::app_role) OR
      has_role(auth.uid(), 'ADMIN'::app_role) OR
      has_role(auth.uid(), 'ACCOUNTANT'::app_role) OR
      has_role(auth.uid(), 'MANAGER'::app_role)
    )
  );

CREATE POLICY "OWNER, ADMIN, ACCOUNTANT, MANAGER can update daily records"
  ON public.daily_records
  FOR UPDATE
  USING (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
    AND (
      has_role(auth.uid(), 'OWNER'::app_role) OR
      has_role(auth.uid(), 'ADMIN'::app_role) OR
      has_role(auth.uid(), 'ACCOUNTANT'::app_role) OR
      has_role(auth.uid(), 'MANAGER'::app_role)
    )
  );

CREATE POLICY "OWNER, ADMIN can delete daily records"
  ON public.daily_records
  FOR DELETE
  USING (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
    AND (
      has_role(auth.uid(), 'OWNER'::app_role) OR
      has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_daily_records_updated_at
  BEFORE UPDATE ON public.daily_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();