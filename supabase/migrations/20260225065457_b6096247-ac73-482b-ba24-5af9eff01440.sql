-- Schedule mark-absent-employees to run every 15 minutes during Nepal work hours
-- Nepal 9:00 AM = UTC 3:15 AM, Nepal 8:00 PM = UTC 2:15 PM
-- Run every 15 min from 3:00 to 14:45 UTC (covers 8:45 AM to 8:30 PM Nepal time)
SELECT cron.unschedule('mark-absent-employees-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-absent-employees-daily');

SELECT cron.schedule(
  'mark-absent-employees-frequent',
  '*/15 3-14 * * 0-5',
  $$
  SELECT net.http_post(
    url := 'https://llcvudydgizzuqctatnt.supabase.co/functions/v1/mark-absent-employees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsY3Z1ZHlkZ2l6enVxY3RhdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTkwMjcsImV4cCI6MjA4MDY3NTAyN30.FbWwwDzMAGT_tgrKsYNsU5c_xXgX7vF9iq1KIlcGovg'
    ),
    body := '{}'::jsonb
  );
  $$
);
