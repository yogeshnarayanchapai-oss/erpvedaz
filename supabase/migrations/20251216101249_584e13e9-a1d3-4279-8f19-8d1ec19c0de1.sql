-- Add entry_type column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'SINGLE';

-- Add comment for documentation
COMMENT ON COLUMN public.leads.entry_type IS 'How the lead was created: SINGLE (form), BULK (bulk add), IMPORT (excel import)';