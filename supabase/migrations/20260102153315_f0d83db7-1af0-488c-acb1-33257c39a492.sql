-- Add new movement types to the enum
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'WHOLESALE_OUT';