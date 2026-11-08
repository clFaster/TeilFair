CREATE TABLE private.write_limits (
  name text PRIMARY KEY,
  value bigint NOT NULL CHECK (value > 0)
);

REVOKE ALL ON TABLE private.write_limits FROM PUBLIC, anon, authenticated;
