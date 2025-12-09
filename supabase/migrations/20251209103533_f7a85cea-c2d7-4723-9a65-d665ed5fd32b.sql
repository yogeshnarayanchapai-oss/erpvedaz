-- Drop existing delete policy and create new one for OWNER only
DROP POLICY IF EXISTS "Allow OWNER and ACCOUNTANT to delete accounts" ON public.accounts;

CREATE POLICY "Allow OWNER to delete accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'OWNER'::app_role));