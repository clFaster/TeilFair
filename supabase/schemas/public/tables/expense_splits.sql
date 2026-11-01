CREATE TABLE "public"."expense_splits" (
  "id"         uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "expense_id" uuid          NOT NULL,
  "member_id"  uuid          NOT NULL,
  "share"      numeric(12,4) NOT NULL,
  "share_type" text          NOT NULL,
  CONSTRAINT "expense_splits_expense_id_member_id_key" UNIQUE (expense_id, member_id),
  CONSTRAINT "expense_splits_pkey" PRIMARY KEY (id),
  CONSTRAINT "expense_splits_share_check" CHECK ((share > (0)::numeric)),
  CONSTRAINT "expense_splits_share_type_check" CHECK ((share_type = ANY (ARRAY['ratio'::text, 'fixed'::text, 'percentage'::text]))),
  CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE,
  CONSTRAINT "expense_splits_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE
);

ALTER TABLE "public"."expense_splits"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits USING btree (expense_id);

CREATE INDEX idx_expense_splits_member_id ON public.expense_splits USING btree (member_id);

CREATE POLICY "Delete expense_splits with write token" ON "public"."expense_splits"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Insert expense_splits with write token" ON "public"."expense_splits"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Read expense_splits with valid group token" ON "public"."expense_splits"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, false)))));

CREATE POLICY "Update expense_splits with write token" ON "public"."expense_splits"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, true)))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_splits" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_splits" TO "service_role";

REVOKE ALL ON TABLE "public"."expense_splits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_splits" TO "postgres";
