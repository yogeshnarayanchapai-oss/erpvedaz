-- Add logistic_order_id column to orders table
ALTER TABLE public.orders ADD COLUMN logistic_order_id TEXT;

-- Create index for faster searching
CREATE INDEX idx_orders_logistic_order_id ON public.orders(logistic_order_id) WHERE logistic_order_id IS NOT NULL;