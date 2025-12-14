-- Create function to get user's effective role for a store
-- Priority: store_role from user_store_access > global role from user_roles
CREATE OR REPLACE FUNCTION public.get_user_store_role(p_user_id uuid, p_store_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First try store-specific role
    (SELECT store_role FROM public.user_store_access 
     WHERE user_id = p_user_id 
       AND store_id = p_store_id 
       AND is_active = true
       AND store_role IS NOT NULL
     LIMIT 1),
    -- Fall back to global role
    (SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1)
  )
$$;

-- Create function to check if user has a specific role for a store
CREATE OR REPLACE FUNCTION public.has_store_role(p_user_id uuid, p_store_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- OWNER always has all roles
    is_owner(p_user_id)
    OR
    -- Check store-specific role first
    EXISTS (
      SELECT 1 FROM public.user_store_access
      WHERE user_id = p_user_id
        AND store_id = p_store_id
        AND is_active = true
        AND store_role = p_role
    )
    OR
    -- If no store role, check global role
    (
      NOT EXISTS (
        SELECT 1 FROM public.user_store_access
        WHERE user_id = p_user_id
          AND store_id = p_store_id
          AND is_active = true
          AND store_role IS NOT NULL
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id
          AND role = p_role
      )
    )
$$;

-- Create function to check if user has admin-level access for a store (OWNER or ADMIN store_role)
CREATE OR REPLACE FUNCTION public.is_store_admin(p_user_id uuid, p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_owner(p_user_id)
    OR has_store_role(p_user_id, p_store_id, 'ADMIN'::app_role)
$$;