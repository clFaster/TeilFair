CREATE TABLE "public"."expense_payers" (
  "id"         uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "expense_id" uuid          NOT NULL,
  "member_id"  uuid          NOT NULL,
  "amount"     numeric(12,2) NOT NULL,
  CONSTRAINT "expense_payers_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "expense_payers_expense_id_member_id_key" UNIQUE (expense_id, member_id),
  CONSTRAINT "expense_payers_pkey" PRIMARY KEY (id),
  CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE,
  CONSTRAINT "expense_payers_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE
);

ALTER TABLE "public"."expense_payers"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_expense_payers_expense_id ON public.expense_payers USING btree (expense_id);

CREATE INDEX idx_expense_payers_member_id ON public.expense_payers USING btree (member_id);

CREATE POLICY "Delete expense_payers with write token" ON "public"."expense_payers"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Insert expense_payers with write token" ON "public"."expense_payers"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Read expense_payers with valid group token" ON "public"."expense_payers"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, false)))));

CREATE POLICY "Update expense_payers with write token" ON "public"."expense_payers"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, true)))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_payers" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_payers" TO "service_role";

REVOKE ALL ON TABLE "public"."expense_payers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_payers" TO "postgres";
