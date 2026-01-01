
-- Grant WAREHOUSE role full access to warehouses table
DROP POLICY IF EXISTS "OWNER and ADMIN can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage warehouses" ON public.warehouses;

CREATE POLICY "OWNER ADMIN WAREHOUSE can manage warehouses"
ON public.warehouses
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role)
);

-- Grant WAREHOUSE role full access to products table
DROP POLICY IF EXISTS "OWNER and ADMIN can manage products" ON public.products;
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage products" ON public.products;

CREATE POLICY "OWNER ADMIN WAREHOUSE can manage products"
ON public.products
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role)
);

-- Grant WAREHOUSE role full access to parties table
DROP POLICY IF EXISTS "OWNER and ADMIN can manage parties" ON public.parties;
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage parties" ON public.parties;
DROP POLICY IF EXISTS "Users can manage parties in their stores" ON public.parties;

CREATE POLICY "OWNER ADMIN WAREHOUSE can manage parties"
ON public.parties
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role)
);

-- Grant WAREHOUSE role full access to stock_movements table
DROP POLICY IF EXISTS "OWNER and ADMIN can manage stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can manage stock movements in their stores" ON public.stock_movements;

CREATE POLICY "OWNER ADMIN WAREHOUSE can manage stock_movements"
ON public.stock_movements
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'WAREHOUSE'::app_role)
);
