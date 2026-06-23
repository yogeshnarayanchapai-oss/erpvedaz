
CREATE TABLE public.consignment_quotation_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_quotation_terms TO authenticated;
GRANT ALL ON public.consignment_quotation_terms TO service_role;
ALTER TABLE public.consignment_quotation_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read terms" ON public.consignment_quotation_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert terms" ON public.consignment_quotation_terms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update terms" ON public.consignment_quotation_terms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete terms" ON public.consignment_quotation_terms FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_cqt_store ON public.consignment_quotation_terms(store_id);
