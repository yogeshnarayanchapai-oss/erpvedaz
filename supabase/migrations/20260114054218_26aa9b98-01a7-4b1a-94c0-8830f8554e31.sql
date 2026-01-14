-- Issue #2: Add "Related to Accounting" checkbox for Stock Movements

-- Add column to stock_movements table
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS related_to_accounting BOOLEAN DEFAULT true;

-- Drop and recreate the trigger function to check related_to_accounting flag
CREATE OR REPLACE FUNCTION public.create_party_transaction_from_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_party_id uuid;
  v_amount numeric;
  v_transaction_type text;
  v_description text;
  v_product_name text;
BEGIN
  -- Skip if not related to accounting
  IF NEW.related_to_accounting = false THEN
    RETURN NEW;
  END IF;

  -- Only process IN and WHOLESALE_OUT movements with a party_id
  IF NEW.movement_type NOT IN ('IN', 'WHOLESALE_OUT') OR NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get party_id and calculate amount
  v_party_id := NEW.party_id;
  
  -- Get product name for description
  SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
  
  IF NEW.movement_type = 'IN' THEN
    -- Stock IN = We received goods, so we owe the party (PAYABLE)
    v_amount := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0);
    v_transaction_type := 'PAYABLE';
    v_description := 'Stock IN: ' || COALESCE(v_product_name, 'Unknown Product') || ' (' || NEW.quantity || ' units @ ' || NEW.unit_price || ')';
  ELSIF NEW.movement_type = 'WHOLESALE_OUT' THEN
    -- Wholesale OUT = We sold goods, party owes us (RECEIVABLE)
    v_amount := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0);
    v_transaction_type := 'RECEIVABLE';
    v_description := 'Wholesale OUT: ' || COALESCE(v_product_name, 'Unknown Product') || ' (' || NEW.quantity || ' units @ ' || NEW.unit_price || ')';
  ELSE
    RETURN NEW;
  END IF;

  -- Only create transaction if amount > 0
  IF v_amount > 0 THEN
    INSERT INTO public.party_transactions (
      party_id,
      store_id,
      transaction_type,
      amount,
      description,
      transaction_date,
      reference_type,
      reference_id,
      created_by
    ) VALUES (
      v_party_id,
      NEW.store_id,
      v_transaction_type,
      v_amount,
      v_description,
      COALESCE(NEW.movement_date, CURRENT_DATE),
      'stock_movement',
      NEW.id,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Issue #3: Fix Lead Visibility for LEAD Role After Transfer

-- Drop and recreate the leads SELECT policy
DROP POLICY IF EXISTS "leads_select_store_isolated" ON public.leads;

CREATE POLICY "leads_select_store_isolated" ON public.leads
FOR SELECT USING (
  is_owner(auth.uid()) 
  OR (
    (store_id IN (SELECT get_user_store_ids(auth.uid())))
    AND (
      has_store_role(auth.uid(), store_id, 'ADMIN'::app_role) OR
      has_store_role(auth.uid(), store_id, 'MANAGER'::app_role) OR
      -- LEADS can see: their team leads, pool leads, OR created by them ONLY if still in LEADS team
      (has_store_role(auth.uid(), store_id, 'LEADS'::app_role) AND (
        (current_team = 'LEADS'::team_type) OR
        (pool_status = 'IN_POOL'::text) OR
        (created_by_user_id = auth.uid() AND current_team = 'LEADS'::team_type)
      )) OR
      -- CALLING can see assigned leads, created leads, or first-assigned leads
      (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND (
        (assigned_to_user_id = auth.uid()) OR 
        (created_by_user_id = auth.uid()) OR 
        (first_assigned_to_user_id = auth.uid())
      )) OR
      (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND (
        (current_team = 'FOLLOWUP'::team_type) OR 
        (assigned_to_user_id = auth.uid())
      )) OR
      (has_store_role(auth.uid(), store_id, 'LOGISTICS'::app_role) AND (status = 'CONFIRMED'::lead_status))
    )
  )
);