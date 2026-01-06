-- ============================================
-- STOCK MOVEMENT ↔ PARTY TRANSACTION SYNC SYSTEM
-- ============================================

-- 1. Create change history table for party transaction audits
CREATE TABLE IF NOT EXISTS public.party_transaction_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_transaction_id UUID REFERENCES public.party_transactions(id) ON DELETE SET NULL,
  stock_movement_id UUID,
  previous_qty NUMERIC,
  new_qty NUMERIC,
  previous_rate NUMERIC,
  new_rate NUMERIC,
  previous_amount NUMERIC NOT NULL,
  new_amount NUMERIC NOT NULL,
  change_reason TEXT NOT NULL, -- 'QTY_CHANGED', 'RATE_CHANGED', 'DATE_CHANGED', 'REMARK_CHANGED', 'DELETED'
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID,
  store_id UUID REFERENCES public.stores(id)
);

-- Enable RLS
ALTER TABLE public.party_transaction_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with store access can view change history"
  ON public.party_transaction_changes FOR SELECT
  USING (user_has_store_access(auth.uid(), store_id));

CREATE POLICY "Users with store access can insert change history"
  ON public.party_transaction_changes FOR INSERT
  WITH CHECK (user_has_store_access(auth.uid(), store_id));

-- Index for performance
CREATE INDEX idx_party_tx_changes_movement ON public.party_transaction_changes(stock_movement_id);
CREATE INDEX idx_party_tx_changes_tx_id ON public.party_transaction_changes(party_transaction_id);

-- 2. BEFORE UPDATE/DELETE trigger to block changes if party transaction is settled
CREATE OR REPLACE FUNCTION block_stock_change_if_settled()
RETURNS trigger AS $$
DECLARE
  v_is_settled BOOLEAN;
  v_settled_count INTEGER;
BEGIN
  -- Only check if party_id is set (has linked party transaction)
  IF OLD.party_id IS NOT NULL THEN
    -- Check if any linked party_transaction is settled
    SELECT COUNT(*) INTO v_settled_count
    FROM party_transactions
    WHERE reference = OLD.id::text
      AND source IN ('WHOLESALE_OUT', 'STOCK_IN')
      AND is_settled = true;
    
    IF v_settled_count > 0 THEN
      -- For UPDATE operations
      IF TG_OP = 'UPDATE' THEN
        -- Allow only if nothing important changed
        IF OLD.qty IS DISTINCT FROM NEW.qty 
           OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
           OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost
           OR (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted = true) THEN
          RAISE EXCEPTION 'This transaction is already cleared. Contact accountant to modify.';
        END IF;
      END IF;
      
      -- For DELETE operations (hard delete - which should not happen but just in case)
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'This transaction is already cleared. Contact accountant to modify.';
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create BEFORE trigger
DROP TRIGGER IF EXISTS block_settled_stock_change ON stock_movements;
CREATE TRIGGER block_settled_stock_change
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION block_stock_change_if_settled();

-- 3. AFTER UPDATE trigger for syncing qty/rate/date/remark changes
CREATE OR REPLACE FUNCTION sync_party_transaction_on_stock_update()
RETURNS trigger AS $$
DECLARE
  v_party_tx_id UUID;
  v_old_amount NUMERIC;
  v_new_amount NUMERIC;
  v_rate NUMERIC;
  v_change_reason TEXT;
  v_store_id UUID;
BEGIN
  -- Only sync if party_id is set and movement type creates party transactions
  IF NEW.party_id IS NOT NULL AND 
     (NEW.movement_type = 'WHOLESALE_OUT' OR 
      (NEW.movement_type = 'IN' AND NEW.movement_source = 'SUPPLIER') OR
      (NEW.movement_type = 'OUT' AND NEW.movement_source = 'WHOLESALE')) THEN
    
    -- Get store_id from party
    SELECT store_id INTO v_store_id FROM parties WHERE id = NEW.party_id;
    
    -- Determine rate based on movement type
    IF NEW.movement_type = 'IN' THEN
      v_rate := COALESCE(NEW.unit_cost, 0);
    ELSE
      v_rate := COALESCE(NEW.unit_price, 0);
    END IF;
    
    -- Calculate new amount
    v_new_amount := NEW.qty * v_rate;
    
    -- Determine change reason
    IF OLD.qty IS DISTINCT FROM NEW.qty AND OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
      v_change_reason := 'QTY_AND_RATE_CHANGED';
    ELSIF OLD.qty IS DISTINCT FROM NEW.qty THEN
      v_change_reason := 'QTY_CHANGED';
    ELSIF OLD.unit_price IS DISTINCT FROM NEW.unit_price OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost THEN
      v_change_reason := 'RATE_CHANGED';
    ELSIF OLD.movement_date IS DISTINCT FROM NEW.movement_date THEN
      v_change_reason := 'DATE_CHANGED';
    ELSIF OLD.remark IS DISTINCT FROM NEW.remark THEN
      v_change_reason := 'REMARK_CHANGED';
    ELSE
      -- No relevant change, skip
      RETURN NEW;
    END IF;
    
    -- Get the linked party_transaction and its old amount
    SELECT id, amount INTO v_party_tx_id, v_old_amount
    FROM party_transactions
    WHERE reference = NEW.id::text
      AND source IN ('WHOLESALE_OUT', 'STOCK_IN')
    LIMIT 1;
    
    IF v_party_tx_id IS NOT NULL THEN
      -- Log the change history
      INSERT INTO party_transaction_changes (
        party_transaction_id, stock_movement_id,
        previous_qty, new_qty, previous_rate, new_rate,
        previous_amount, new_amount, change_reason,
        changed_by, store_id
      ) VALUES (
        v_party_tx_id, NEW.id,
        OLD.qty, NEW.qty,
        CASE WHEN OLD.movement_type = 'IN' THEN OLD.unit_cost ELSE OLD.unit_price END,
        v_rate,
        v_old_amount, v_new_amount, v_change_reason,
        auth.uid(), v_store_id
      );
      
      -- Update the party_transaction
      UPDATE party_transactions
      SET 
        qty = NEW.qty,
        rate = v_rate,
        amount = v_new_amount,
        date = NEW.movement_date,
        remarks = NEW.remark
      WHERE id = v_party_tx_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create AFTER UPDATE trigger for qty/rate/date/remark
DROP TRIGGER IF EXISTS sync_party_tx_on_stock_update ON stock_movements;
CREATE TRIGGER sync_party_tx_on_stock_update
  AFTER UPDATE OF qty, unit_price, unit_cost, movement_date, remark
  ON stock_movements
  FOR EACH ROW
  WHEN (OLD.party_id IS NOT NULL)
  EXECUTE FUNCTION sync_party_transaction_on_stock_update();

-- 4. AFTER UPDATE trigger for soft delete (is_deleted)
CREATE OR REPLACE FUNCTION sync_party_transaction_on_stock_delete()
RETURNS trigger AS $$
DECLARE
  v_party_tx_id UUID;
  v_old_amount NUMERIC;
  v_store_id UUID;
BEGIN
  -- Handle soft delete (is_deleted = true)
  IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
    -- Only if party_id was set
    IF NEW.party_id IS NOT NULL THEN
      -- Get store_id from party
      SELECT store_id INTO v_store_id FROM parties WHERE id = NEW.party_id;
      
      -- Get the linked party_transaction
      SELECT id, amount INTO v_party_tx_id, v_old_amount
      FROM party_transactions
      WHERE reference = NEW.id::text
        AND source IN ('WHOLESALE_OUT', 'STOCK_IN')
      LIMIT 1;
      
      IF v_party_tx_id IS NOT NULL THEN
        -- Log the deletion in change history
        INSERT INTO party_transaction_changes (
          party_transaction_id, stock_movement_id,
          previous_qty, new_qty, previous_rate, new_rate,
          previous_amount, new_amount, change_reason,
          changed_by, store_id
        ) VALUES (
          v_party_tx_id, NEW.id,
          NEW.qty, 0,
          CASE WHEN NEW.movement_type = 'IN' THEN NEW.unit_cost ELSE NEW.unit_price END,
          0,
          v_old_amount, 0, 'DELETED',
          auth.uid(), v_store_id
        );
        
        -- Delete the party_transaction
        DELETE FROM party_transactions WHERE id = v_party_tx_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create AFTER UPDATE trigger for soft delete
DROP TRIGGER IF EXISTS sync_party_tx_on_stock_delete ON stock_movements;
CREATE TRIGGER sync_party_tx_on_stock_delete
  AFTER UPDATE OF is_deleted
  ON stock_movements
  FOR EACH ROW
  WHEN (NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false))
  EXECUTE FUNCTION sync_party_transaction_on_stock_delete();