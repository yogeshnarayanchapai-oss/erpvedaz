-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage HR settings" ON public.hr_settings;

-- Create a new policy that allows all authenticated users to manage HR settings
-- (date display mode should be changeable by any logged-in user)
CREATE POLICY "Authenticated users can manage HR settings"
ON public.hr_settings
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);