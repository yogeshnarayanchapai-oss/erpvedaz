-- Step 1: Backfill missing party_transactions for WHOLESALE_OUT movements
INSERT INTO party_transactions (
  party_id, date, product_id, warehouse_id, 
  qty, rate, amount, direction, source, reference, remarks, store_id
)
SELECT 
  sm.party_id,
  sm.movement_date,
  sm.product_id,
  sm.warehouse_id,
  sm.qty,
  COALESCE(sm.unit_price, 0),
  sm.qty * COALESCE(sm.unit_price, 0),
  'RECEIVABLE',
  'WHOLESALE_OUT',
  sm.id::text,
  sm.remark,
  p.store_id
FROM stock_movements sm
JOIN parties p ON sm.party_id = p.id
WHERE sm.movement_type = 'WHOLESALE_OUT'
  AND sm.party_id IS NOT NULL
  AND (sm.is_deleted = false OR sm.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM party_transactions pt 
    WHERE pt.reference = sm.id::text 
    AND pt.source = 'WHOLESALE_OUT'
  );

-- Step 2: Update existing party_transactions with store_id where NULL
UPDATE party_transactions pt
SET store_id = p.store_id
FROM parties p
WHERE pt.party_id = p.id
  AND pt.store_id IS NULL;

-- Step 3: Update the trigger function to include store_id
CREATE OR REPLACE FUNCTION public.create_party_transaction_from_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_count INTEGER;
  v_store_id UUID;
BEGIN
  -- Only create party transaction if party_id is set
  IF NEW.party_id IS NOT NULL AND NEW.movement_source IS NOT NULL THEN
    
    -- Get the store_id from the party
    SELECT store_id INTO v_store_id FROM parties WHERE id = NEW.party_id;
    
    -- For SUPPLIER purchases (IN movements)
    IF NEW.movement_type = 'IN' AND NEW.movement_source = 'SUPPLIER' THEN
      -- Check if a party transaction already exists for this stock movement
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'STOCK_IN'
        AND reference = NEW.id::text;
      
      -- Only create if no existing record
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks,
          store_id
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_cost, 0),
          NEW.qty * COALESCE(NEW.unit_cost, 0),
          'PAYABLE',
          'STOCK_IN',
          NEW.id::text,
          NEW.remark,
          v_store_id
        );
      END IF;
    END IF;
    
    -- For WHOLESALE sales (WHOLESALE_OUT movements) - creates RECEIVABLE
    IF NEW.movement_type = 'WHOLESALE_OUT' AND NEW.movement_source = 'WHOLESALE' THEN
      -- Check if a party transaction already exists for this stock movement
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'WHOLESALE_OUT'
        AND reference = NEW.id::text;
      
      -- Only create if no existing record
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks,
          store_id
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_price, 0),
          NEW.qty * COALESCE(NEW.unit_price, 0),
          'RECEIVABLE',
          'WHOLESALE_OUT',
          NEW.id::text,
          NEW.remark,
          v_store_id
        );
      END IF;
    END IF;
    
    -- Legacy support: For regular OUT movements with WHOLESALE source
    IF NEW.movement_type = 'OUT' AND NEW.movement_source = 'WHOLESALE' THEN
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'WHOLESALE_OUT'
        AND reference = NEW.id::text;
      
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks,
          store_id
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_price, 0),
          NEW.qty * COALESCE(NEW.unit_price, 0),
          'RECEIVABLE',
          'WHOLESALE_OUT',
          NEW.id::text,
          NEW.remark,
          v_store_id
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;