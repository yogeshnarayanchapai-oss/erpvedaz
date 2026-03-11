ALTER TABLE public.task_remarks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OPEN';

-- Only top-level remarks (tickets) use status. Set all existing top-level remarks to OPEN
UPDATE public.task_remarks SET status = 'OPEN' WHERE parent_remark_id IS NULL;
-- Replies don't need status, set to empty
UPDATE public.task_remarks SET status = 'REPLY' WHERE parent_remark_id IS NOT NULL;