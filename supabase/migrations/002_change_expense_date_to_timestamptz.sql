-- Migration: Change expense_date from DATE to TIMESTAMPTZ
-- This allows storing both date and time for expenses, not just the date

-- Convert the expense_date column from DATE to TIMESTAMPTZ
-- Existing DATE values will be automatically converted to timestamps at midnight UTC
ALTER TABLE expenses 
  ALTER COLUMN expense_date TYPE TIMESTAMPTZ 
  USING expense_date::TIMESTAMPTZ;

-- Update the default to use NOW() instead of CURRENT_DATE
ALTER TABLE expenses 
  ALTER COLUMN expense_date SET DEFAULT NOW();
