CREATE POLICY "LEADS can view store transfer summary"
ON public.lead_transfers
FOR SELECT
TO authenticated
USING (
  is_owner(auth.uid())
  OR (
    store_id IS NOT NULL
    AND user_has_store_access(auth.uid(), store_id)
    AND (
      has_store_role(auth.uid(), store_id, 'LEADS'::app_role)
      OR has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
      OR has_store_role(auth.uid(), store_id, 'MANAGER'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_transfers.lead_id
      AND user_has_store_access(auth.uid(), l.store_id)
      AND (
        has_store_role(auth.uid(), l.store_id, 'LEADS'::app_role)
        OR has_store_role(auth.uid(), l.store_id, 'ADMIN'::app_role)
        OR has_store_role(auth.uid(), l.store_id, 'MANAGER'::app_role)
      )
  )
);