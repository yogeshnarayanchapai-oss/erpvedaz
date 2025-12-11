-- Allow calling staff and leads staff to insert customers when creating orders
CREATE POLICY "Staff can insert customers when creating orders" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('CALLING', 'LEADS', 'ADMIN', 'OWNER', 'MANAGER', 'FOLLOWUP', 'LOGISTICS')
  )
);

-- Allow staff to update customers in their store
CREATE POLICY "Staff can update customers in their store" 
ON public.customers 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('CALLING', 'LEADS', 'ADMIN', 'OWNER', 'MANAGER', 'FOLLOWUP', 'LOGISTICS')
  )
  AND store_id IN (SELECT get_user_store_ids(auth.uid()))
);