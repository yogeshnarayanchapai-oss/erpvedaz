CREATE OR REPLACE FUNCTION public.has_store_role(p_user_id uuid, p_store_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    is_owner(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_store_access
      WHERE user_id = p_user_id
        AND store_id = p_store_id
        AND is_active = true
        AND (
          store_role = p_role
          OR (p_role = 'MANAGER'::app_role AND store_role = 'SALES_MANAGER'::app_role)
          OR (p_role = 'ADMIN'::app_role AND store_role = 'SALES_MANAGER'::app_role)
        )
    )
    OR (
      NOT EXISTS (
        SELECT 1
        FROM public.user_store_access
        WHERE user_id = p_user_id
          AND store_id = p_store_id
          AND is_active = true
          AND store_role IS NOT NULL
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = p_user_id
          AND (
            role = p_role
            OR (p_role = 'MANAGER'::app_role AND role = 'SALES_MANAGER'::app_role)
            OR (p_role = 'ADMIN'::app_role AND role = 'SALES_MANAGER'::app_role)
          )
      )
    )
$function$;

ALTER POLICY leads_select_store_isolated ON public.leads
USING (
  is_owner(auth.uid())
  OR (
    user_has_store_access(auth.uid(), leads.store_id)
    AND (
      has_store_role(auth.uid(), leads.store_id, 'ADMIN'::app_role)
      OR has_store_role(auth.uid(), leads.store_id, 'MANAGER'::app_role)
      OR (
        has_store_role(auth.uid(), leads.store_id, 'LEADS'::app_role)
        AND (current_team = 'LEADS'::team_type OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid())
      )
      OR (
        has_store_role(auth.uid(), leads.store_id, 'CALLING'::app_role)
        AND (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid() OR first_assigned_to_user_id = auth.uid())
      )
      OR (
        has_store_role(auth.uid(), leads.store_id, 'FOLLOWUP'::app_role)
        AND (current_team = 'FOLLOWUP'::team_type OR assigned_to_user_id = auth.uid())
      )
      OR (
        has_store_role(auth.uid(), leads.store_id, 'LOGISTICS'::app_role)
        AND status = 'CONFIRMED'::lead_status
      )
    )
  )
);

ALTER POLICY leads_update_store_isolated ON public.leads
USING (
  user_has_store_access(auth.uid(), leads.store_id)
  AND (
    is_owner(auth.uid())
    OR has_store_role(auth.uid(), leads.store_id, 'ADMIN'::app_role)
    OR has_store_role(auth.uid(), leads.store_id, 'MANAGER'::app_role)
    OR (
      has_store_role(auth.uid(), leads.store_id, 'LEADS'::app_role)
      AND (current_team = 'LEADS'::team_type OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid())
    )
    OR (
      has_store_role(auth.uid(), leads.store_id, 'CALLING'::app_role)
      AND assigned_to_user_id = auth.uid()
    )
    OR (
      has_store_role(auth.uid(), leads.store_id, 'FOLLOWUP'::app_role)
      AND current_team = 'FOLLOWUP'::team_type
    )
  )
)
WITH CHECK (
  user_has_store_access(auth.uid(), leads.store_id)
  AND auth.uid() IS NOT NULL
);

ALTER POLICY leads_delete_store_isolated ON public.leads
USING (
  user_has_store_access(auth.uid(), leads.store_id)
  AND (
    is_owner(auth.uid())
    OR has_store_role(auth.uid(), leads.store_id, 'ADMIN'::app_role)
  )
);

ALTER POLICY orders_select_store_isolated ON public.orders
USING (
  is_owner(auth.uid())
  OR (
    user_has_store_access(auth.uid(), orders.store_id)
    AND (
      has_store_role(auth.uid(), orders.store_id, 'ADMIN'::app_role)
      OR has_store_role(auth.uid(), orders.store_id, 'MANAGER'::app_role)
      OR has_store_role(auth.uid(), orders.store_id, 'LOGISTICS'::app_role)
      OR has_store_role(auth.uid(), orders.store_id, 'FOLLOWUP'::app_role)
      OR sales_person_id = auth.uid()
      OR created_by_staff_id = auth.uid()
      OR assigned_to_user_id = auth.uid()
    )
  )
);

ALTER POLICY orders_update_store_isolated ON public.orders
USING (
  user_has_store_access(auth.uid(), orders.store_id)
  AND (
    is_owner(auth.uid())
    OR has_store_role(auth.uid(), orders.store_id, 'ADMIN'::app_role)
    OR has_store_role(auth.uid(), orders.store_id, 'MANAGER'::app_role)
    OR has_store_role(auth.uid(), orders.store_id, 'LOGISTICS'::app_role)
    OR (
      has_store_role(auth.uid(), orders.store_id, 'FOLLOWUP'::app_role)
      AND delivery_location = 'OUTSIDE_VALLEY'
    )
    OR (
      has_store_role(auth.uid(), orders.store_id, 'CALLING'::app_role)
      AND (sales_person_id = auth.uid() OR assigned_to_user_id = auth.uid())
    )
  )
)
WITH CHECK (
  user_has_store_access(auth.uid(), orders.store_id)
  AND auth.uid() IS NOT NULL
);

ALTER POLICY orders_delete_store_isolated ON public.orders
USING (
  user_has_store_access(auth.uid(), orders.store_id)
  AND (
    is_owner(auth.uid())
    OR has_store_role(auth.uid(), orders.store_id, 'ADMIN'::app_role)
  )
);