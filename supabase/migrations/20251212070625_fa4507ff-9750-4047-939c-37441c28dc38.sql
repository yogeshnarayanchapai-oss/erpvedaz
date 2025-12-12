-- Add last_message_at column to chat_rooms for sorting by recent activity
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message ON public.chat_rooms(store_id, last_message_at DESC);

-- Create trigger function to update last_message_at when a message is sent
CREATE OR REPLACE FUNCTION public.update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms
  SET last_message_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_chat_room_last_message ON public.chat_messages;
CREATE TRIGGER trigger_update_chat_room_last_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_room_last_message();

-- Backfill existing rooms with their last message time
UPDATE public.chat_rooms cr
SET last_message_at = COALESCE(
  (SELECT MAX(created_at) FROM public.chat_messages cm WHERE cm.room_id = cr.id),
  cr.created_at
);