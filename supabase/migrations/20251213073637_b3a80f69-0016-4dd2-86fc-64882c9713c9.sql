-- Add reference_order_count column to stock_movements table for P/L calculations
ALTER TABLE public.stock_movements 
ADD COLUMN reference_order_count integer DEFAULT 0;