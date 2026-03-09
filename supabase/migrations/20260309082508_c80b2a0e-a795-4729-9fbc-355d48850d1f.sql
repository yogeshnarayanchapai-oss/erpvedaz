INSERT INTO module_store_settings (module_name, is_store_wise)
VALUES ('task_management', true)
ON CONFLICT DO NOTHING;