
CREATE TABLE public.module_store_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name text NOT NULL UNIQUE,
  is_store_wise boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert defaults
INSERT INTO module_store_settings (module_name) VALUES
  ('sales'), ('inventory'), ('accounting'), ('marketing'), ('hrm');

-- RLS
ALTER TABLE module_store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read module settings" ON module_store_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only OWNER can update module settings" ON module_store_settings
  FOR UPDATE TO authenticated
  USING (is_owner(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_module_store_settings_updated_at
  BEFORE UPDATE ON module_store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
