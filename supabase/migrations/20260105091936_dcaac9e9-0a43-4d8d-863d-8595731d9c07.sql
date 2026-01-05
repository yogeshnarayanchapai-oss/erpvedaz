-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily backup at midnight Nepal Time (UTC+5:45 = 18:15 UTC previous day)
SELECT cron.schedule(
  'daily-vedaz-erp-backup',
  '15 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://llcvudydgizzuqctatnt.supabase.co/functions/v1/scheduled-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsY3Z1ZHlkZ2l6enVxY3RhdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTkwMjcsImV4cCI6MjA4MDY3NTAyN30.FbWwwDzMAGT_tgrKsYNsU5c_xXgX7vF9iq1KIlcGovg'
    ),
    body := jsonb_build_object('trigger', 'scheduled')
  );
  $$
);