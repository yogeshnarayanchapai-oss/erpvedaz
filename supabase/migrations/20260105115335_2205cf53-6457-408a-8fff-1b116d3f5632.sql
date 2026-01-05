-- Add store_id to backup_logs for store-wise tracking
ALTER TABLE backup_logs 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_backup_logs_store_id ON backup_logs(store_id);