
-- Add approval_status to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Set existing stock_movement transactions to PENDING
UPDATE public.transactions 
SET approval_status = 'PENDING' 
WHERE reference_type = 'stock_movement' AND approval_status = 'NONE';

-- Create transaction_approval_history table
CREATE TABLE public.transaction_approval_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.transaction_approval_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval history" ON public.transaction_approval_history
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert approval history" ON public.transaction_approval_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_approval_history_tx ON public.transaction_approval_history(transaction_id);
CREATE INDEX idx_transactions_approval ON public.transactions(approval_status) WHERE reference_type = 'stock_movement';

-- Update create_transaction_from_stock_movement to set approval_status = 'PENDING'
CREATE OR REPLACE FUNCTION public.create_transaction_from_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_store_id uuid;
  v_amount numeric;
  v_transaction_type text;
  v_type text;
  v_qty numeric;
  v_rate numeric;
  v_existing_tx_id uuid;
  v_product_name text;
BEGIN
  -- Handle toggle updates (related_to_accounting toggled off)
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.related_to_accounting, true) = true AND NEW.related_to_accounting = false THEN
      -- Only allow toggle off if not APPROVED
      IF EXISTS (
        SELECT 1 FROM public.transactions 
        WHERE reference_type = 'stock_movement' 
          AND reference_id = NEW.id::text 
          AND approval_status = 'APPROVED'
      ) THEN
        RAISE EXCEPTION 'Cannot uncheck accounting - transaction is already approved.';
      END IF;
      DELETE FROM public.transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text;
      RETURN NEW;
    END IF;

    IF COALESCE(OLD.related_to_accounting, true) = false AND NEW.related_to_accounting = true THEN
      NULL;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.related_to_accounting = false THEN
    RETURN NEW;
  END IF;

  IF NEW.movement_type NOT IN ('IN', 'WHOLESALE_OUT') OR NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_tx_id
  FROM public.transactions
  WHERE reference_type = 'stock_movement'
    AND reference_id = NEW.id::text
  LIMIT 1;

  IF v_existing_tx_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT store_id INTO v_store_id FROM public.parties WHERE id = NEW.party_id;
  SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;

  v_qty := COALESCE(NEW.qty, 0);

  IF NEW.movement_type = 'IN' THEN
    v_transaction_type := 'SALES_IN';
    v_type := 'expense';
    v_rate := COALESCE(NULLIF(NEW.unit_cost, 0), NULLIF(NEW.unit_price, 0), 0);
  ELSE
    v_transaction_type := 'SALES_OUT';
    v_type := 'income';
    v_rate := COALESCE(NULLIF(NEW.unit_price, 0), NULLIF(NEW.unit_cost, 0), 0);
  END IF;

  v_amount := v_qty * v_rate;

  IF v_amount > 0 THEN
    INSERT INTO public.transactions (
      date, type, transaction_type, amount, currency, account_id,
      party_id, description, note, is_cleared, store_id,
      reference_type, reference_id, approval_status
    ) VALUES (
      COALESCE(NEW.movement_date, CURRENT_DATE),
      v_type, v_transaction_type, v_amount, 'NPR', NULL,
      NEW.party_id,
      v_transaction_type || ' - ' || COALESCE(v_product_name, 'Product'),
      NEW.remark, false, v_store_id,
      'stock_movement', NEW.id::text, 'PENDING'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update block_stock_change_if_settled to check approval_status
CREATE OR REPLACE FUNCTION public.block_stock_change_if_settled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_approved BOOLEAN;
BEGIN
  IF OLD.party_id IS NOT NULL THEN
    -- Check if linked transaction is APPROVED
    SELECT EXISTS(
      SELECT 1 FROM transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = OLD.id::text
        AND approval_status = 'APPROVED'
    ) INTO v_is_approved;
    
    IF v_is_approved THEN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.qty IS DISTINCT FROM NEW.qty 
           OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
           OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost
           OR (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted = true)
           OR (OLD.related_to_accounting IS DISTINCT FROM NEW.related_to_accounting AND NEW.related_to_accounting = false) THEN
          RAISE EXCEPTION 'This transaction is approved in accounting. Set it to pending first before modifying.';
        END IF;
      END IF;
      
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'This transaction is approved in accounting. Set it to pending first before modifying.';
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update sync_transaction_on_stock_update to only sync when PENDING
CREATE OR REPLACE FUNCTION public.sync_transaction_on_stock_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id UUID;
  v_rate NUMERIC;
  v_new_amount NUMERIC;
  v_approval_status TEXT;
BEGIN
  IF NEW.party_id IS NOT NULL AND 
     NEW.movement_type IN ('IN', 'WHOLESALE_OUT') THEN
    
    IF NEW.movement_type = 'IN' THEN
      v_rate := COALESCE(NULLIF(NEW.unit_cost, 0), NULLIF(NEW.unit_price, 0), 0);
    ELSE
      v_rate := COALESCE(NULLIF(NEW.unit_price, 0), NULLIF(NEW.unit_cost, 0), 0);
    END IF;
    
    v_new_amount := NEW.qty * v_rate;
    
    IF OLD.qty IS DISTINCT FROM NEW.qty 
       OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
       OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost
       OR OLD.movement_date IS DISTINCT FROM NEW.movement_date
       OR OLD.remark IS DISTINCT FROM NEW.remark THEN
      
      -- Only sync if transaction is PENDING (not APPROVED)
      SELECT id, approval_status INTO v_tx_id, v_approval_status
      FROM transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text
      LIMIT 1;
      
      IF v_tx_id IS NOT NULL AND v_approval_status = 'PENDING' THEN
        UPDATE transactions
        SET 
          amount = v_new_amount,
          date = NEW.movement_date,
          note = NEW.remark
        WHERE id = v_tx_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update sync_transaction_on_stock_delete to only delete PENDING
CREATE OR REPLACE FUNCTION public.sync_transaction_on_stock_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_approval_status TEXT;
BEGIN
  IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
    IF NEW.party_id IS NOT NULL THEN
      -- Check approval status before deleting
      SELECT approval_status INTO v_approval_status
      FROM transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text
      LIMIT 1;
      
      -- block_stock_change_if_settled already prevents this for APPROVED,
      -- but just in case, only delete PENDING
      IF v_approval_status IS NULL OR v_approval_status != 'APPROVED' THEN
        DELETE FROM transactions
        WHERE reference_type = 'stock_movement'
          AND reference_id = NEW.id::text;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
