CREATE OR REPLACE FUNCTION private.consume_write_budget(budget_scope text, max_requests bigint, seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE start_time timestamptz; consumed bigint;
BEGIN
  start_time := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / seconds) * seconds);
  INSERT INTO private.write_budgets AS b(scope,period_seconds,starts_at,used)
    VALUES (budget_scope,seconds,start_time,1)
    ON CONFLICT (scope,period_seconds) DO UPDATE
    SET starts_at=excluded.starts_at,
        used=CASE WHEN b.starts_at < excluded.starts_at THEN 1 ELSE b.used+1 END
    WHERE b.starts_at < excluded.starts_at OR b.used < max_requests
    RETURNING used INTO consumed;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Too many requests. Please try again later.' USING ERRCODE='P0001';
  END IF;
END $$;
REVOKE ALL ON FUNCTION private.consume_write_budget(text,bigint,integer) FROM PUBLIC, anon, authenticated;
