-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create DM rooms" ON public.chat_rooms;

-- Create a new INSERT policy that allows users to create chat rooms in their stores
CREATE POLICY "Users can create chat rooms in their stores"
ON public.chat_rooms
FOR INSERT
TO public
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must have access to the store
  store_id IN (
    SELECT usa.store_id
    FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
  AND
  -- User must be the creator
  created_by = auth.uid()
);

-- Also add an UPDATE policy for participants management
DROP POLICY IF EXISTS "Users can update room participants" ON public.chat_rooms;

CREATE POLICY "Users can update chat rooms"
ON public.chat_rooms
FOR UPDATE
TO public
USING (
  -- Admins/Owners can update any room in their stores
  (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role))
    AND store_id IN (
      SELECT usa.store_id
      FROM user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.is_active = true
    )
  )
  OR
  -- Room creator can update their room
  created_by = auth.uid()
  OR
  -- Participants can update the room (for muting, etc.)
  auth.uid() = ANY(participants)
)
WITH CHECK (
  store_id IN (
    SELECT usa.store_id
    FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);