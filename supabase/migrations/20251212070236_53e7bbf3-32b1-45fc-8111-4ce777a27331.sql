-- Allow Admin/Owner to delete any message, users can delete their own (unsend)
CREATE POLICY "Admin and Owner can delete any message"
ON public.chat_messages
FOR DELETE
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'OWNER'::app_role) OR
  sender_id = auth.uid()
);