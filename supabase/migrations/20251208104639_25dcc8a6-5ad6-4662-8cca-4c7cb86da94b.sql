-- Create a security definer function to check if user has store access without recursion
CREATE OR REPLACE FUNCTION public.user_has_store_access(p_user_id uuid, p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_store_access
    WHERE user_id = p_user_id
      AND store_id = p_store_id
      AND is_active = true
  )
$$;

-- Create a function to get user's active store IDs
CREATE OR REPLACE FUNCTION public.get_user_store_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id
  FROM public.user_store_access
  WHERE user_id = p_user_id
    AND is_active = true
$$;

-- Drop the problematic ADMIN policy
DROP POLICY IF EXISTS "ADMIN can manage store access for their stores" ON public.user_store_access;

-- Recreate the ADMIN policy using the security definer function
CREATE POLICY "ADMIN can manage store access for their stores"
ON public.user_store_access
FOR ALL
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) 
  AND store_id IN (SELECT public.get_user_store_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role) 
  AND store_id IN (SELECT public.get_user_store_ids(auth.uid()))
);