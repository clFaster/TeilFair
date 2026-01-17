-- Fix Supabase security warnings
-- 1. Add search_path to functions to prevent schema injection attacks
-- 2. Fix overly permissive RLS policy on groups table

-- ============================================================================
-- Fix function search_path warnings
-- ============================================================================

-- Recreate get_token function with search_path set
CREATE OR REPLACE FUNCTION get_token()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.headers', true)::json->>'x-group-token';
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

-- Recreate check_group_access function with search_path set
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Fix overly permissive RLS policy on groups table
-- ============================================================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can create groups" ON groups;

-- Create a more secure policy that validates token requirements
-- This ensures that new groups have properly formatted tokens
CREATE POLICY "Anyone can create groups with valid tokens" ON groups
    FOR INSERT WITH CHECK (
        -- Ensure tokens are provided and meet length requirements
        LENGTH(read_token) >= 32
        AND LENGTH(write_token) >= 32
        AND read_token != write_token
        -- Additional validation: tokens should not be empty or just whitespace
        AND TRIM(read_token) != ''
        AND TRIM(write_token) != ''
    );
