-- Fix cross-store notification leaking
-- The issue: store_id IS NULL allows notifications to be seen by all users matching the role

-- Drop existing policy
DROP POLICY IF EXISTS notifications_select_store_isolated ON notifications;

-- Create stricter policy that requires store_id for role-targeted notifications
CREATE POLICY notifications_select_store_isolated ON notifications
  FOR SELECT USING (
    is_owner(auth.uid()) 
    OR (
      -- User must be the target OR match the target role
      (target_user_id = auth.uid() OR target_role = (SELECT role::text FROM profiles WHERE id = auth.uid()))
      AND (
        -- For user-targeted notifications (target_user_id set), allow null store_id (direct messages)
        (target_user_id IS NOT NULL AND target_role IS NULL)
        OR
        -- For role-targeted notifications, REQUIRE store_id to match user's stores
        (target_role IS NOT NULL AND store_id IS NOT NULL AND store_id IN (SELECT get_user_store_ids(auth.uid())))
        OR
        -- For user-targeted + store-scoped notifications, require store match
        (target_user_id IS NOT NULL AND store_id IS NOT NULL AND store_id IN (SELECT get_user_store_ids(auth.uid())))
      )
    )
  );

-- Update existing notifications with NULL store_id to fix historical data
-- Update based on order's store_id for order-related notifications
UPDATE notifications n
SET store_id = o.store_id
FROM orders o
WHERE n.meta->>'orderId' IS NOT NULL
  AND o.id::text = n.meta->>'orderId'
  AND n.store_id IS NULL
  AND o.store_id IS NOT NULL;

-- Update based on lead's store_id for lead-related notifications
UPDATE notifications n
SET store_id = l.store_id
FROM leads l
WHERE n.meta->>'leadId' IS NOT NULL
  AND l.id::text = n.meta->>'leadId'
  AND n.store_id IS NULL
  AND l.store_id IS NOT NULL;