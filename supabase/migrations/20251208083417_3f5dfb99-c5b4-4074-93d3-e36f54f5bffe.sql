-- Enable realtime for notifications table to ensure instant delivery
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;