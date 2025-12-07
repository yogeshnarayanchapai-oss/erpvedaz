-- Update profiles SELECT policy to include LEADS role
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;

CREATE POLICY "Users can view profiles based on role" ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  has_role(auth.uid(), 'HR'::app_role) OR
  has_role(auth.uid(), 'LEADS'::app_role) OR
  has_role(auth.uid(), 'FOLLOWUP'::app_role) OR
  has_role(auth.uid(), 'CALLING'::app_role) OR
  has_role(auth.uid(), 'LOGISTICS'::app_role)
);