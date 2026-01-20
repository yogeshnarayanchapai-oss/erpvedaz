
-- Update has_role function to check both user_roles and user_store_access tables
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    -- Check user_roles table (global roles)
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND (
          role = _role 
          OR role = 'OWNER'::app_role  -- OWNER has all roles
        )
    )
    OR
    -- Check user_store_access table (store-specific roles)
    EXISTS (
      SELECT 1
      FROM public.user_store_access
      WHERE user_id = _user_id
        AND is_active = true
        AND (
          store_role = _role
          OR store_role = 'OWNER'::app_role  -- OWNER has all roles
        )
    )
$function$;
