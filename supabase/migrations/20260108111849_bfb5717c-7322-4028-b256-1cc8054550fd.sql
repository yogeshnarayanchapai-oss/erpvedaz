-- Fix leave_types RLS to support store-level roles
-- The issue: has_role() only checks global user_roles table, not store-specific roles in user_store_access

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage leave types in their stores" ON public.leave_types;
DROP POLICY IF EXISTS "Users can view leave types in their stores" ON public.leave_types;

-- Create new SELECT policy - allow users to view leave types in stores they have access to
CREATE POLICY "Users can view leave types in their stores"
ON public.leave_types
FOR SELECT
TO public
USING (
  -- Global/shared leave types (no store)
  store_id IS NULL
  OR
  -- Store-specific: user must have access to this store
  store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- Create new INSERT policy - allow admins/owners/HR to create leave types
CREATE POLICY "Admins can create leave types in their stores"
ON public.leave_types
FOR INSERT
TO public
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  (
    -- Global role allows management
    has_role(auth.uid(), 'OWNER'::app_role)
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
    OR
    -- Store-level role allows management (ADMIN or HR role for this specific store)
    EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.store_id = leave_types.store_id
        AND usa.is_active = true
        AND usa.store_role IN ('OWNER', 'ADMIN', 'HR')
    )
  )
);

-- Create new UPDATE policy
CREATE POLICY "Admins can update leave types in their stores"
ON public.leave_types
FOR UPDATE
TO public
USING (
  -- Must have access to this store
  (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
  AND
  (
    has_role(auth.uid(), 'OWNER'::app_role)
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
    OR EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.store_id = leave_types.store_id
        AND usa.is_active = true
        AND usa.store_role IN ('OWNER', 'ADMIN', 'HR')
    )
  )
)
WITH CHECK (
  (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
  AND
  (
    has_role(auth.uid(), 'OWNER'::app_role)
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
    OR EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.store_id = leave_types.store_id
        AND usa.is_active = true
        AND usa.store_role IN ('OWNER', 'ADMIN', 'HR')
    )
  )
);

-- Create new DELETE policy
CREATE POLICY "Admins can delete leave types in their stores"
ON public.leave_types
FOR DELETE
TO public
USING (
  (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
  AND
  (
    has_role(auth.uid(), 'OWNER'::app_role)
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
    OR EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.store_id = leave_types.store_id
        AND usa.is_active = true
        AND usa.store_role IN ('OWNER', 'ADMIN', 'HR')
    )
  )
);