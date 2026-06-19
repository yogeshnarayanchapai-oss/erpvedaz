CREATE TABLE public.consignment_setting_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('STATUS', 'PAYMENT_CATEGORY')),
  code text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, category, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_setting_options TO authenticated;
GRANT ALL ON public.consignment_setting_options TO service_role;
ALTER TABLE public.consignment_setting_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cso_select" ON public.consignment_setting_options FOR SELECT TO authenticated USING (is_owner(auth.uid()) OR user_has_store_access(auth.uid(), store_id));
CREATE POLICY "cso_insert" ON public.consignment_setting_options FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()) OR user_has_store_access(auth.uid(), store_id));
CREATE POLICY "cso_update" ON public.consignment_setting_options FOR UPDATE TO authenticated USING (is_owner(auth.uid()) OR user_has_store_access(auth.uid(), store_id));
CREATE POLICY "cso_delete" ON public.consignment_setting_options FOR DELETE TO authenticated USING (is_owner(auth.uid()) OR user_has_store_access(auth.uid(), store_id));
CREATE INDEX idx_cso_store_cat ON public.consignment_setting_options(store_id, category, sort_order);