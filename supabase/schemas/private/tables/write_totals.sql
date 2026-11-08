CREATE TABLE private.write_totals (
  table_name text PRIMARY KEY,
  total bigint NOT NULL CHECK (total >= 0)
);

REVOKE ALL ON TABLE private.write_totals FROM PUBLIC, anon, authenticated;
