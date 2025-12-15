-- Check and enable RLS on daily_records table
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to recreate them properly
DROP POLICY IF EXISTS "Users can view daily_records in their stores" ON public.daily_records;
DROP POLICY IF EXISTS "Users can insert daily_records in their stores" ON public.daily_records;
DROP POLICY IF EXISTS "Users can update daily_records in their stores" ON public.daily_records;
DROP POLICY IF EXISTS "Users can delete daily_records in their stores" ON public.daily_records;

-- SELECT policy: Users can view daily records for stores they have access to
CREATE POLICY "Users can view daily_records in their stores"
ON public.daily_records
FOR SELECT
USING (
  public.user_has_store_access(auth.uid(), store_id)
);

-- INSERT policy: Users can insert daily records for stores they have access to
CREATE POLICY "Users can insert daily_records in their stores"
ON public.daily_records
FOR INSERT
WITH CHECK (
  public.user_has_store_access(auth.uid(), store_id)
);

-- UPDATE policy: Users can update daily records for stores they have access to
CREATE POLICY "Users can update daily_records in their stores"
ON public.daily_records
FOR UPDATE
USING (
  public.user_has_store_access(auth.uid(), store_id)
);

-- DELETE policy: Users can delete daily records for stores they have access to
CREATE POLICY "Users can delete daily_records in their stores"
ON public.daily_records
FOR DELETE
USING (
  public.user_has_store_access(auth.uid(), store_id)
);