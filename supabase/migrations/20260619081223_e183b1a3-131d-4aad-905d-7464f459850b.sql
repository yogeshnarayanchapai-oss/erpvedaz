ALTER TABLE public.consignment_activity_logs DROP CONSTRAINT IF EXISTS consignment_activity_logs_consignment_id_fkey;
ALTER TABLE public.consignment_activity_logs ALTER COLUMN consignment_id DROP NOT NULL;
ALTER TABLE public.consignment_activity_logs ADD CONSTRAINT consignment_activity_logs_consignment_id_fkey FOREIGN KEY (consignment_id) REFERENCES public.consignments(id) ON DELETE SET NULL;
GRANT SELECT, INSERT ON public.consignment_activity_logs TO authenticated;
GRANT ALL ON public.consignment_activity_logs TO service_role;