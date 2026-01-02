-- Add from_warehouse_id and to_warehouse_id columns for warehouse transfers
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS from_warehouse_id uuid REFERENCES public.warehouses(id),
ADD COLUMN IF NOT EXISTS to_warehouse_id uuid REFERENCES public.warehouses(id);

-- Add comment for documentation
COMMENT ON COLUMN public.stock_movements.from_warehouse_id IS 'Source warehouse for TRANSFER_OUT movements';
COMMENT ON COLUMN public.stock_movements.to_warehouse_id IS 'Destination warehouse for TRANSFER_IN movements';