-- Add quantity column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;