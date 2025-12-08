-- Add store_id column to notifications table for multi-tenant filtering
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Create index for efficient store-based queries
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON public.notifications(store_id);

-- Update RLS policy to be store-aware
-- First drop existing policies if any
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;

-- Create new store-aware RLS policies
-- OWNER can see all notifications
-- Others can only see notifications from their store or targeted to them specifically
CREATE POLICY "Users can view notifications" ON public.notifications
FOR SELECT USING (
  -- OWNER role sees all notifications
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'OWNER'::app_role
  )
  OR
  -- Others see notifications targeted to them specifically OR matching their role with store filter
  (
    target_user_id = auth.uid()
    OR
    (
      target_role::text = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
      AND (
        store_id IS NULL 
        OR store_id IN (
          SELECT usa.store_id FROM public.user_store_access usa WHERE usa.user_id = auth.uid()
        )
      )
    )
  )
);

-- Anyone can insert notifications
CREATE POLICY "Users can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update notifications" ON public.notifications
FOR UPDATE USING (
  target_user_id = auth.uid()
  OR
  target_role::text = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'OWNER'::app_role
  )
);