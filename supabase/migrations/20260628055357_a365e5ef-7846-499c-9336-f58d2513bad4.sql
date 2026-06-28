CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND (
          role = _role 
          OR role = 'OWNER'::app_role
          OR (_role IN ('ADMIN'::app_role, 'MANAGER'::app_role) AND role = 'SALES_MANAGER'::app_role)
        )
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.user_store_access
      WHERE user_id = _user_id
        AND is_active = true
        AND (
          store_role = _role
          OR store_role = 'OWNER'::app_role
          OR (_role IN ('ADMIN'::app_role, 'MANAGER'::app_role) AND store_role = 'SALES_MANAGER'::app_role)
        )
    )
$function$;