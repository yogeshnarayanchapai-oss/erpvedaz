-- Fix customers table - enable RLS and add proper policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can create customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

-- Create secure RLS policies for customers
CREATE POLICY "Staff can view customers" 
ON public.customers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'MANAGER'::app_role) OR 
  has_role(auth.uid(), 'CALLING'::app_role) OR 
  has_role(auth.uid(), 'FOLLOWUP'::app_role) OR 
  has_role(auth.uid(), 'LOGISTICS'::app_role)
);

CREATE POLICY "Staff can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'CALLING'::app_role) OR 
  has_role(auth.uid(), 'LOGISTICS'::app_role)
);

CREATE POLICY "Staff can update customers" 
ON public.customers 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'MANAGER'::app_role) OR 
  has_role(auth.uid(), 'CALLING'::app_role)
);

CREATE POLICY "Admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (has_role(auth.uid(), 'ADMIN'::app_role));