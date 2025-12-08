-- Add policy to allow users to view store access for users in the same store
-- This enables lead transfer modal to find CALLING staff in the same store

CREATE POLICY "Users can view store access for users in same store" 
ON public.user_store_access
FOR SELECT
USING (
  store_id IN (SELECT public.get_user_store_ids(auth.uid()))
);