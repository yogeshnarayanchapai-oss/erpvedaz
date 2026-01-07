-- Helper function to get all public tables
CREATE OR REPLACE FUNCTION public.get_all_public_tables()
RETURNS TABLE(table_name text, has_store_id boolean) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.table_name::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns c 
      WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'store_id'
    ) as has_store_id
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

-- Helper function to check if a table has a specific column
CREATE OR REPLACE FUNCTION public.table_has_column(p_table_name text, p_column_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name 
    AND column_name = p_column_name
  );
$$;