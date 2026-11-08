CREATE TABLE "public"."expenses" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "group_id"     uuid                     NOT NULL,
  "description"  text                     NOT NULL,
  "total_amount" numeric(12,2)            NOT NULL,
  "expense_date" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "revision"     integer                  NOT NULL DEFAULT 1,
  CONSTRAINT "expenses_revision_check" CHECK (revision > 0),
  CONSTRAINT "expenses_pkey" PRIMARY KEY (id),
  CONSTRAINT "expenses_description_length" CHECK ((char_length(description) BETWEEN 1 AND 250 AND description ~ '[^[:space:]]')),
  CONSTRAINT "expenses_date_range" CHECK ((isfinite(expense_date) AND expense_date >= '0001-01-01 00:00:00+00'::timestamptz AND expense_date < '10000-01-01 00:00:00+00'::timestamptz)),
  CONSTRAINT "expenses_total_amount_check" CHECK ((total_amount > (0)::numeric)),
  CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);

ALTER TABLE "public"."expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);

CREATE INDEX idx_expenses_group_id ON public.expenses USING btree (group_id);

CREATE TRIGGER prevent_group_reassignment
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION private.prevent_group_reassignment();

CREATE POLICY "Delete expenses with write token" ON "public"."expenses"
  FOR DELETE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

CREATE POLICY "Insert expenses with write token" ON "public"."expenses"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (private.check_group_access(group_id, true));

CREATE POLICY "Read expenses with valid group token" ON "public"."expenses"
  FOR SELECT
  TO PUBLIC
  USING (private.check_group_access(group_id, false));

CREATE POLICY "Update expenses with write token" ON "public"."expenses"
  FOR UPDATE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

GRANT DELETE, SELECT ON TABLE "public"."expenses" TO "anon", "authenticated";
REVOKE INSERT, UPDATE, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE public.expenses FROM anon, authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "service_role";

REVOKE ALL ON TABLE "public"."expenses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "postgres";
