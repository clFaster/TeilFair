CREATE TABLE private.write_budgets (
  scope text NOT NULL,
  period_seconds integer NOT NULL,
  starts_at timestamptz NOT NULL,
  used bigint NOT NULL,
  PRIMARY KEY (scope,period_seconds)
);

REVOKE ALL ON TABLE private.write_budgets FROM PUBLIC, anon, authenticated;
