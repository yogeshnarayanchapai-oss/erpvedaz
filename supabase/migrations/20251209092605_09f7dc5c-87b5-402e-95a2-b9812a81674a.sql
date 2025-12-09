
-- Update RLS policies for inventory tables
-- OWNER and ADMIN can edit, ACCOUNTANT can only view, all store-wise

-- ============================================
-- PRODUCT_INVENTORY TABLE (uses warehouse_id -> warehouses.store_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "OWNER and ADMIN can manage product_inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "ACCOUNTANT can view product_inventory" ON public.product_inventory;

-- OWNER and ADMIN full access
CREATE POLICY "OWNER and ADMIN can manage product_inventory"
ON public.product_inventory
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role)
);

-- ACCOUNTANT view only (store-wise via warehouse)
CREATE POLICY "ACCOUNTANT can view product_inventory"
ON public.product_inventory
FOR SELECT
USING (
  has_role(auth.uid(), 'ACCOUNTANT'::app_role) AND
  warehouse_id IN (
    SELECT w.id FROM warehouses w 
    WHERE w.store_id IN (
      SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid()
    )
  )
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
DROP POLICY IF EXISTS "OWNER and ADMIN can manage products" ON public.products;
DROP POLICY IF EXISTS "ACCOUNTANT can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.products;

-- OWNER and ADMIN full access
CREATE POLICY "OWNER and ADMIN can manage products"
ON public.products
FOR ALL
USING (
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role)
);

-- ACCOUNTANT view only (store-wise)
CREATE POLICY "ACCOUNTANT can view products"
ON public.products
FOR SELECT
USING (
  has_role(auth.uid(), 'ACCOUNTANT'::app_role) AND
  store_id IN (
    SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid()
  )
);

-- Other authenticated users can view active products in their store
CREATE POLICY "Authenticated users can view active products"
ON public.products
FOR SELECT
USING (
  is_active = true AND
  store_id IN (
    SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid()
  )
);
