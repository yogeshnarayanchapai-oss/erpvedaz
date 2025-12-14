-- Update branches SELECT policy to allow all authenticated users to view active branches
DROP POLICY IF EXISTS "Authenticated users can view active branches" ON public.branches;

CREATE POLICY "All authenticated users can view active branches" 
ON public.branches 
FOR SELECT 
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role));