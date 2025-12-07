-- Drop existing insert policies for leads
DROP POLICY IF EXISTS "insert_leads_by_role" ON public.leads;
DROP POLICY IF EXISTS "calling_can_insert_leads" ON public.leads;

-- Create a unified insert policy that allows ADMIN, LEADS, CALLING, FOLLOWUP, and MANAGER roles to insert leads
CREATE POLICY "insert_leads_by_role" ON public.leads
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  (has_role(auth.uid(), 'LEADS'::app_role) AND created_by_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'CALLING'::app_role) AND created_by_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND created_by_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'MANAGER'::app_role) AND created_by_user_id = auth.uid())
);