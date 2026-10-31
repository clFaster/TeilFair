-- Apply after 004. These indexes cover member lookups for FK checks and
-- ON DELETE CASCADE; UNIQUE (expense_id, member_id) starts with expense_id.
-- Standard index creation blocks writes while building: run during low traffic.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_expense_payers_member_id
    ON public.expense_payers (member_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id
    ON public.expense_splits (member_id);

-- Retain the date and group-token indexes. An unused-index advisory records
-- observed usage, not proof that an index is unnecessary for future workloads.
COMMIT;
