DROP POLICY IF EXISTS consignments_delete ON public.consignments;
CREATE POLICY consignments_delete ON public.consignments FOR DELETE TO authenticated
USING (
  is_owner(auth.uid())
  OR (
    user_has_store_access(auth.uid(), store_id)
    AND COALESCE(is_completed, false) = false
  )
);