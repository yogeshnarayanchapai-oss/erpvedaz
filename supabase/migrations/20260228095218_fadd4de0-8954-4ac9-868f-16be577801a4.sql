
-- DROP the expensive profiles RLS policy that calls has_role() 7 times per row
-- This is causing 17 BILLION sequential scans on user_roles table
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Replace with a single efficient policy: all authenticated users can view profiles
-- (profiles contain non-sensitive data like name, role - needed for displaying staff names everywhere)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Admin/Owner can update any profile (using inline EXISTS, no function calls)
CREATE POLICY "Admins and owners can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- Reset sequential scan stats by analyzing the tables
ANALYZE public.user_roles;
ANALYZE public.user_store_access;
ANALYZE public.profiles;
