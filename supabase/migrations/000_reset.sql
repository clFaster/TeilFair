-- Drop all policies and functions first
DROP POLICY IF EXISTS "Anyone can create groups" ON groups;
DROP POLICY IF EXISTS "Read groups with valid token" ON groups;
DROP POLICY IF EXISTS "Update groups with write token" ON groups;
DROP POLICY IF EXISTS "Delete groups with write token" ON groups;

DROP POLICY IF EXISTS "Read members with valid group token" ON members;
DROP POLICY IF EXISTS "Insert members with write token" ON members;
DROP POLICY IF EXISTS "Update members with write token" ON members;
DROP POLICY IF EXISTS "Delete members with write token" ON members;

DROP POLICY IF EXISTS "Read expenses with valid group token" ON expenses;
DROP POLICY IF EXISTS "Insert expenses with write token" ON expenses;
DROP POLICY IF EXISTS "Update expenses with write token" ON expenses;
DROP POLICY IF EXISTS "Delete expenses with write token" ON expenses;

DROP POLICY IF EXISTS "Read expense_payers with valid group token" ON expense_payers;
DROP POLICY IF EXISTS "Insert expense_payers with write token" ON expense_payers;
DROP POLICY IF EXISTS "Update expense_payers with write token" ON expense_payers;
DROP POLICY IF EXISTS "Delete expense_payers with write token" ON expense_payers;

DROP POLICY IF EXISTS "Read expense_splits with valid group token" ON expense_splits;
DROP POLICY IF EXISTS "Insert expense_splits with write token" ON expense_splits;
DROP POLICY IF EXISTS "Update expense_splits with write token" ON expense_splits;
DROP POLICY IF EXISTS "Delete expense_splits with write token" ON expense_splits;

DROP FUNCTION IF EXISTS check_group_access;
DROP FUNCTION IF EXISTS get_token;

-- Disable RLS temporarily
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payers DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;

-- Now run the contents of 001_initial_schema.sql starting from the helper functions
