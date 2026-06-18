
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.consignment_status AS ENUM (
    'INQUIRY_RECEIVED','QUOTATION_SENT','ORDER_CONFIRMED','ADVANCE_RECEIVED',
    'SUPPLIER_ORDERED','GOODS_READY','PICKED_UP','IN_ORIGIN_WAREHOUSE',
    'SHIPPED','IN_TRANSIT','ARRIVED_AT_PORT','CUSTOMS_PENDING','CUSTOMS_CLEARED',
    'IN_NEPAL_WAREHOUSE','OUT_FOR_DELIVERY','DELIVERED','COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shipment_mode AS ENUM ('AIR','SEA','ROAD','COURIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ consignments ============
CREATE TABLE IF NOT EXISTS public.consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  consignment_code TEXT NOT NULL,
  customer_party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  supplier_party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  product_name TEXT,
  product_category TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  weight NUMERIC,
  cbm NUMERIC,
  origin_country TEXT,
  destination TEXT,
  shipment_mode public.shipment_mode,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_arrival_date DATE,
  notes TEXT,
  -- shipment
  shipment_id TEXT,
  container_number TEXT,
  tracking_number TEXT,
  vehicle_number TEXT,
  agent_name TEXT,
  carrier_name TEXT,
  warehouse_location TEXT,
  current_location TEXT,
  eta DATE,
  delivery_address TEXT,
  -- status + finance
  status public.consignment_status NOT NULL DEFAULT 'INQUIRY_RECEIVED',
  customer_billing_amount NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  estimated_profit NUMERIC DEFAULT 0,
  actual_profit NUMERIC DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, consignment_code)
);
CREATE INDEX IF NOT EXISTS idx_consignments_store ON public.consignments(store_id);
CREATE INDEX IF NOT EXISTS idx_consignments_status ON public.consignments(status);
CREATE INDEX IF NOT EXISTS idx_consignments_completed ON public.consignments(is_completed);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignments TO authenticated;
GRANT ALL ON public.consignments TO service_role;
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consignments_select" ON public.consignments FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));
CREATE POLICY "consignments_insert" ON public.consignments FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));
CREATE POLICY "consignments_update" ON public.consignments FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));
CREATE POLICY "consignments_delete" ON public.consignments FOR DELETE TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));

-- auto code + updated_at
CREATE OR REPLACE FUNCTION public.set_consignment_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  IF NEW.consignment_code IS NULL OR NEW.consignment_code = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN consignment_code ~ '^CNS-[0-9]+$'
           THEN CAST(SUBSTRING(consignment_code FROM 5) AS INTEGER) ELSE 0 END
    ), 0) + 1 INTO n
    FROM public.consignments WHERE store_id = NEW.store_id;
    NEW.consignment_code := 'CNS-' || LPAD(n::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_consignment_code ON public.consignments;
CREATE TRIGGER trg_set_consignment_code BEFORE INSERT ON public.consignments
  FOR EACH ROW EXECUTE FUNCTION public.set_consignment_code();

DROP TRIGGER IF EXISTS trg_consignments_updated_at ON public.consignments;
CREATE TRIGGER trg_consignments_updated_at BEFORE UPDATE ON public.consignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ status history ============
CREATE TABLE IF NOT EXISTS public.consignment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  previous_status public.consignment_status,
  new_status public.consignment_status NOT NULL,
  remarks TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csh_consignment ON public.consignment_status_history(consignment_id);
GRANT SELECT, INSERT ON public.consignment_status_history TO authenticated;
GRANT ALL ON public.consignment_status_history TO service_role;
ALTER TABLE public.consignment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csh_select" ON public.consignment_status_history FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));
CREATE POLICY "csh_insert" ON public.consignment_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));

-- ============ costs ============
CREATE TABLE IF NOT EXISTS public.consignment_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  cost_type TEXT NOT NULL, -- PRODUCT/SUPPLIER/FREIGHT/CUSTOMS/AGENT/TRANSPORT/WAREHOUSE/PACKAGING/OTHER
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'NPR',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_consignment ON public.consignment_costs(consignment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_costs TO authenticated;
GRANT ALL ON public.consignment_costs TO service_role;
ALTER TABLE public.consignment_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_all" ON public.consignment_costs FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));

-- ============ payments ============
CREATE TABLE IF NOT EXISTS public.consignment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  direction TEXT NOT NULL, -- RECEIVED (from customer) or PAID (to supplier/agent/etc.)
  payment_for TEXT, -- CUSTOMER/SUPPLIER/FREIGHT/CUSTOMS/AGENT/OTHER
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  note TEXT,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cp_consignment ON public.consignment_payments(consignment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_payments TO authenticated;
GRANT ALL ON public.consignment_payments TO service_role;
ALTER TABLE public.consignment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_all" ON public.consignment_payments FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));

-- ============ documents ============
CREATE TABLE IF NOT EXISTS public.consignment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  doc_type TEXT NOT NULL, -- SUPPLIER_INVOICE / CUSTOMER_INVOICE / PACKING_LIST / BOL_AWB / PO / CUSTOMS / RECEIPT / DELIVERY_PROOF / OTHER
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cd_consignment ON public.consignment_documents(consignment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_documents TO authenticated;
GRANT ALL ON public.consignment_documents TO service_role;
ALTER TABLE public.consignment_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cd_all" ON public.consignment_documents FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));

-- ============ activity log ============
CREATE TABLE IF NOT EXISTS public.consignment_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id UUID NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cal_consignment ON public.consignment_activity_logs(consignment_id);
GRANT SELECT, INSERT ON public.consignment_activity_logs TO authenticated;
GRANT ALL ON public.consignment_activity_logs TO service_role;
ALTER TABLE public.consignment_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cal_select" ON public.consignment_activity_logs FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));
CREATE POLICY "cal_insert" ON public.consignment_activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id));
