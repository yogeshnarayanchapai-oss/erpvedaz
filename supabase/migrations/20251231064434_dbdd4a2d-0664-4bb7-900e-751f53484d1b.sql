-- Add WAREHOUSE role to product_inventory management policy
DROP POLICY IF EXISTS "OWNER and ADMIN can manage product_inventory" ON public.product_inventory;

CREATE POLICY "OWNER ADMIN WAREHOUSE can manage product_inventory"
ON public.product_inventory
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role)
);