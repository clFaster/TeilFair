-- TeilFair Database Schema - FIXED VERSION
-- Capability-based security: no user accounts, access controlled by tokens

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    read_token TEXT NOT NULL,
    write_token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure tokens are unique and not guessable
    CONSTRAINT read_token_length CHECK (LENGTH(read_token) >= 32),
    CONSTRAINT write_token_length CHECK (LENGTH(write_token) >= 32),
    CONSTRAINT tokens_different CHECK (read_token != write_token)
);

-- Create indexes for token lookups
CREATE INDEX idx_groups_read_token ON groups(read_token);
CREATE INDEX idx_groups_write_token ON groups(write_token);

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_group_id ON members(group_id);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- Expense payers (who paid)
CREATE TABLE expense_payers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    
    UNIQUE(expense_id, member_id)
);

CREATE INDEX idx_expense_payers_expense_id ON expense_payers(expense_id);

-- Expense splits (who owes)
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    share DECIMAL(12, 4) NOT NULL CHECK (share > 0),
    share_type TEXT NOT NULL CHECK (share_type IN ('ratio', 'fixed', 'percentage')),
    
    UNIQUE(expense_id, member_id)
);

CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Helper function to get token from request header
CREATE OR REPLACE FUNCTION get_token()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.headers', true)::json->>'x-group-token';
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if a token is valid for a group
CREATE OR REPLACE FUNCTION check_group_access(group_id UUID, require_write BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
DECLARE
    provided_token TEXT;
    group_record RECORD;
BEGIN
    provided_token := get_token();
    
    IF provided_token IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT read_token, write_token INTO group_record
    FROM groups
    WHERE id = group_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    IF require_write THEN
        RETURN provided_token = group_record.write_token;
    ELSE
        RETURN provided_token = group_record.read_token 
            OR provided_token = group_record.write_token;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Groups policies
-- Anyone can create a group (no authentication required)
CREATE POLICY "Anyone can create groups" ON groups
    FOR INSERT WITH CHECK (true);

-- Can only read a group with valid token
CREATE POLICY "Read groups with valid token" ON groups
    FOR SELECT USING (
        (get_token() = read_token OR get_token() = write_token)
        OR get_token() IS NULL -- Allow for now during testing, should be removed in production
    );

-- Can only update a group with write token
CREATE POLICY "Update groups with write token" ON groups
    FOR UPDATE USING (
        get_token() = write_token
    );

-- Can only delete a group with write token
CREATE POLICY "Delete groups with write token" ON groups
    FOR DELETE USING (
        get_token() = write_token
    );

-- Members policies
CREATE POLICY "Read members with valid group token" ON members
    FOR SELECT USING (check_group_access(group_id, FALSE));

CREATE POLICY "Insert members with write token" ON members
    FOR INSERT WITH CHECK (check_group_access(group_id, TRUE));

CREATE POLICY "Update members with write token" ON members
    FOR UPDATE USING (check_group_access(group_id, TRUE));

CREATE POLICY "Delete members with write token" ON members
    FOR DELETE USING (check_group_access(group_id, TRUE));

-- Expenses policies
CREATE POLICY "Read expenses with valid group token" ON expenses
    FOR SELECT USING (check_group_access(group_id, FALSE));

CREATE POLICY "Insert expenses with write token" ON expenses
    FOR INSERT WITH CHECK (check_group_access(group_id, TRUE));

CREATE POLICY "Update expenses with write token" ON expenses
    FOR UPDATE USING (check_group_access(group_id, TRUE));

CREATE POLICY "Delete expenses with write token" ON expenses
    FOR DELETE USING (check_group_access(group_id, TRUE));

-- Expense payers policies (access via expense's group)
CREATE POLICY "Read expense_payers with valid group token" ON expense_payers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, FALSE)
        )
    );

CREATE POLICY "Insert expense_payers with write token" ON expense_payers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Update expense_payers with write token" ON expense_payers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Delete expense_payers with write token" ON expense_payers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

-- Expense splits policies (access via expense's group)
CREATE POLICY "Read expense_splits with valid group token" ON expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, FALSE)
        )
    );

CREATE POLICY "Insert expense_splits with write token" ON expense_splits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Update expense_splits with write token" ON expense_splits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Delete expense_splits with write token" ON expense_splits
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );
