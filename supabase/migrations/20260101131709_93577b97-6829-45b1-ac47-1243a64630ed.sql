-- Drop existing policies and recreate with proper role checking for both user_roles AND store_role

-- WAREHOUSES: Add WAREHOUSE role check including store_role
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage warehouses" ON public.warehouses;
CREATE POLICY "OWNER ADMIN WAREHOUSE can manage warehouses"
ON public.warehouses
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.is_active = true
      AND usa.store_role = 'WAREHOUSE'::app_role
  )
);

-- PRODUCTS: Add WAREHOUSE role check including store_role
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage products" ON public.products;
CREATE POLICY "OWNER ADMIN WAREHOUSE can manage products"
ON public.products
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.is_active = true
      AND usa.store_role = 'WAREHOUSE'::app_role
  )
);

-- PARTIES: Add WAREHOUSE role check including store_role
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage parties" ON public.parties;
CREATE POLICY "OWNER ADMIN WAREHOUSE can manage parties"
ON public.parties
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.is_active = true
      AND usa.store_role = 'WAREHOUSE'::app_role
  )
);

-- STOCK_MOVEMENTS: Add WAREHOUSE role check including store_role
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage stock_movements" ON public.stock_movements;
CREATE POLICY "OWNER ADMIN WAREHOUSE can manage stock_movements"
ON public.stock_movements
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
      AND usa.is_active = true
      AND usa.store_role = 'WAREHOUSE'::app_role
  )
);