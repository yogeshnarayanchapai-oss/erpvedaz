-- Ensure OWNER always has access: update RLS to use user_has_store_access() (which includes is_owner())

-- =========================
-- leave_types
-- =========================

-- SELECT: allow viewing shared types + store types for any user with store access (OWNER included)
ALTER POLICY "Users can view leave types in their stores"
ON public.leave_types
USING (
  store_id IS NULL
  OR public.user_has_store_access(auth.uid(), store_id)
);

-- INSERT: require store access for store-scoped rows (OWNER included via user_has_store_access)
ALTER POLICY "Admins can create leave types in their stores"
ON public.leave_types
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    store_id IS NULL
    OR public.user_has_store_access(auth.uid(), store_id)
  )
  AND (
    has_role(auth.uid(), 'OWNER'::public.app_role)
    OR has_role(auth.uid(), 'ADMIN'::public.app_role)
    OR has_role(auth.uid(), 'HR'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_store_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.store_id = public.leave_types.store_id
        AND usa.is_active = true
        AND usa.store_role = ANY (ARRAY['OWNER'::public.app_role, 'ADMIN'::public.app_role, 'HR'::public.app_role])
    )
  )
);

-- UPDATE: allow OWNER always, others only within store access
ALTER POLICY "Admins can update leave types in their stores"
ON public.leave_types
USING (
  public.is_owner(auth.uid())
  OR (
    (store_id IS NULL OR public.user_has_store_access(auth.uid(), store_id))
    AND (
      has_role(auth.uid(), 'ADMIN'::public.app_role)
      OR has_role(auth.uid(), 'HR'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid()
          AND usa.store_id = public.leave_types.store_id
          AND usa.is_active = true
          AND usa.store_role = ANY (ARRAY['OWNER'::public.app_role, 'ADMIN'::public.app_role, 'HR'::public.app_role])
      )
    )
  )
)
WITH CHECK (
  public.is_owner(auth.uid())
  OR (
    (store_id IS NULL OR public.user_has_store_access(auth.uid(), store_id))
    AND (
      has_role(auth.uid(), 'ADMIN'::public.app_role)
      OR has_role(auth.uid(), 'HR'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid()
          AND usa.store_id = public.leave_types.store_id
          AND usa.is_active = true
          AND usa.store_role = ANY (ARRAY['OWNER'::public.app_role, 'ADMIN'::public.app_role, 'HR'::public.app_role])
      )
    )
  )
);

-- DELETE: allow OWNER always, others only within store access
ALTER POLICY "Admins can delete leave types in their stores"
ON public.leave_types
USING (
  public.is_owner(auth.uid())
  OR (
    (store_id IS NULL OR public.user_has_store_access(auth.uid(), store_id))
    AND (
      has_role(auth.uid(), 'ADMIN'::public.app_role)
      OR has_role(auth.uid(), 'HR'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid()
          AND usa.store_id = public.leave_types.store_id
          AND usa.is_active = true
          AND usa.store_role = ANY (ARRAY['OWNER'::public.app_role, 'ADMIN'::public.app_role, 'HR'::public.app_role])
      )
    )
  )
);


-- =========================
-- chat_rooms
-- =========================

-- INSERT: allow creation if user has store access (OWNER included via user_has_store_access)
ALTER POLICY "Users can create chat rooms in their stores"
ON public.chat_rooms
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND (
    store_id IS NULL
    OR public.user_has_store_access(auth.uid(), store_id)
  )
);

-- UPDATE: allow updates in stores user has access to (OWNER included) + keep creator/participant exceptions
ALTER POLICY "Users can update chat rooms"
ON public.chat_rooms
USING (
  (
    (has_role(auth.uid(), 'ADMIN'::public.app_role) OR has_role(auth.uid(), 'OWNER'::public.app_role))
    AND (store_id IS NULL OR public.user_has_store_access(auth.uid(), store_id))
  )
  OR created_by = auth.uid()
  OR auth.uid() = ANY (participants)
)
WITH CHECK (
  store_id IS NULL
  OR public.user_has_store_access(auth.uid(), store_id)
);

-- ADMIN manage-all policy: keep, but ensure OWNER isn't blocked by store access checks
ALTER POLICY "Admins can manage store chat rooms"
ON public.chat_rooms
USING (
  (has_role(auth.uid(), 'ADMIN'::public.app_role) OR has_role(auth.uid(), 'OWNER'::public.app_role))
  AND (
    store_id IS NULL
    OR public.user_has_store_access(auth.uid(), store_id)
  )
);