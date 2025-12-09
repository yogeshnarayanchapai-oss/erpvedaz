-- Drop existing delete policy and create a new one using has_role function
DROP POLICY IF EXISTS "Users can delete accounts" ON public.accounts;

CREATE POLICY "Users can delete accounts" 
ON public.accounts 
FOR DELETE 
USING (has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'ACCOUNTANT'::app_role));