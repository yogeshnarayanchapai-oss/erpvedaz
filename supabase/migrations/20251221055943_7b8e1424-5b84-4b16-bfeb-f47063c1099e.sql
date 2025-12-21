-- Drop existing restrictive MARKETING policies
DROP POLICY IF EXISTS "MARKETING can update recent store ad spend reference" ON public.ad_spend_reference;
DROP POLICY IF EXISTS "MARKETING can delete recent store ad spend reference" ON public.ad_spend_reference;

-- Create new policies that allow MARKETING to update/delete any date (same as ADMIN)
CREATE POLICY "MARKETING can update store ad spend reference" 
ON public.ad_spend_reference 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'MARKETING'::app_role) 
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
);

CREATE POLICY "MARKETING can delete store ad spend reference" 
ON public.ad_spend_reference 
FOR DELETE 
USING (
  has_role(auth.uid(), 'MARKETING'::app_role) 
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
);