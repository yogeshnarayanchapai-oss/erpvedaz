-- Add store_id to chat_rooms and chat_messages
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add read receipts and file support to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_by uuid[];
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS mentions uuid[];
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id);
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;

-- Update chat_rooms type to support DM and add members
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS participants uuid[];
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS is_muted_by uuid[];
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS role_based_group text; -- e.g., 'CALLING', 'LOGISTICS', 'HR', etc.

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_store_id ON public.chat_rooms(store_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_store_id ON public.chat_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participants ON public.chat_rooms USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Drop old RLS policies and create new store-scoped ones
DROP POLICY IF EXISTS "Admins can manage chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they belong to" ON public.chat_rooms;

-- Chat rooms policies (store-scoped)
CREATE POLICY "Admins can manage store chat rooms" ON public.chat_rooms
FOR ALL USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

CREATE POLICY "Users can view their store rooms" ON public.chat_rooms
FOR SELECT USING (
  (type = 'GLOBAL'::text) 
  OR has_role(auth.uid(), 'ADMIN'::app_role) 
  OR has_role(auth.uid(), 'OWNER'::app_role)
  OR (store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true))
  OR (auth.uid() = ANY(participants))
);

CREATE POLICY "Users can create DM rooms" ON public.chat_rooms
FOR INSERT WITH CHECK (
  type = 'DIRECT'::text 
  AND auth.uid() = ANY(participants)
  AND store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true)
);

-- Chat messages policies (store-scoped)
DROP POLICY IF EXISTS "Admins can manage messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can view store messages" ON public.chat_messages
FOR SELECT USING (
  room_id IN (
    SELECT id FROM chat_rooms WHERE 
      type = 'GLOBAL'::text 
      OR (store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true))
      OR (auth.uid() = ANY(participants))
  )
);

CREATE POLICY "Users can send store messages" ON public.chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() 
  AND room_id IN (
    SELECT id FROM chat_rooms WHERE 
      type = 'GLOBAL'::text 
      OR (store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true))
      OR (auth.uid() = ANY(participants))
  )
);

CREATE POLICY "Users can update their messages" ON public.chat_messages
FOR UPDATE USING (sender_id = auth.uid());

-- Allow anyone to update read status on messages in rooms they can access
CREATE POLICY "Users can mark messages as read" ON public.chat_messages
FOR UPDATE USING (
  room_id IN (
    SELECT id FROM chat_rooms WHERE 
      store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true)
      OR (auth.uid() = ANY(participants))
  )
);

-- Admins can manage messages in their store
CREATE POLICY "Admins can manage store messages" ON public.chat_messages
FOR ALL USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role))
  AND room_id IN (
    SELECT id FROM chat_rooms WHERE 
      store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true)
  )
);

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- Update attendance_records to add store_id filtering in RLS
DROP POLICY IF EXISTS "Admins and HR can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Employees can check in/out" ON public.attendance_records;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Employees can view their own attendance" ON public.attendance_records;

CREATE POLICY "Admins and HR can manage store attendance" ON public.attendance_records
FOR ALL USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'HR'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role))
  AND (store_id IS NULL OR store_id IN (SELECT usa.store_id FROM user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true))
);

CREATE POLICY "Employees can manage own attendance" ON public.attendance_records
FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Function to auto-generate username if not set
CREATE OR REPLACE FUNCTION generate_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := lower(replace(NEW.name, ' ', '_')) || '_' || substr(NEW.id::text, 1, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate username
DROP TRIGGER IF EXISTS auto_generate_username ON public.profiles;
CREATE TRIGGER auto_generate_username
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION generate_username();

-- Backfill usernames for existing profiles
UPDATE public.profiles 
SET username = lower(replace(name, ' ', '_')) || '_' || substr(id::text, 1, 4)
WHERE username IS NULL;