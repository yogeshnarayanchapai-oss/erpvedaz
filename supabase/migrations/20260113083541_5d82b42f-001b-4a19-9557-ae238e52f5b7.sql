-- Create cost_settings table (single row per store, not per month)
CREATE TABLE IF NOT EXISTS cost_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  rto_percent numeric NOT NULL DEFAULT 10,
  usd_rate numeric NOT NULL DEFAULT 150,
  delivery_charge_per_order numeric NOT NULL DEFAULT 250,
  rto_charge_per_unit numeric NOT NULL DEFAULT 200,
  redirect_charge_per_unit numeric NOT NULL DEFAULT 50,
  office_cost_per_order numeric NOT NULL DEFAULT 50,
  redirect_percent numeric NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT cost_settings_store_unique UNIQUE (store_id)
);

-- Enable RLS
ALTER TABLE cost_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view cost settings of their store" ON cost_settings
  FOR SELECT USING (store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert cost settings for their store" ON cost_settings
  FOR INSERT WITH CHECK (store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update cost settings of their store" ON cost_settings
  FOR UPDATE USING (store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete cost settings of their store" ON cost_settings
  FOR DELETE USING (store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  ));