CREATE TABLE "public"."members" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "group_id"   uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT "members_pkey" PRIMARY KEY (id),
  CONSTRAINT "members_name_length" CHECK ((char_length(name) BETWEEN 1 AND 100 AND name ~ '[^[:space:]]'))
);

ALTER TABLE "public"."members"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_members_group_id ON public.members USING btree (group_id);

CREATE TRIGGER prevent_group_reassignment
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION private.prevent_group_reassignment();

CREATE POLICY "Delete members with write token" ON "public"."members"
  FOR DELETE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

CREATE POLICY "Insert members with write token" ON "public"."members"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (private.check_group_access(group_id, true));

CREATE POLICY "Read members with valid group token" ON "public"."members"
  FOR SELECT
  TO PUBLIC
  USING (private.check_group_access(group_id, false));

CREATE POLICY "Update members with write token" ON "public"."members"
  FOR UPDATE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."members" TO "anon", "authenticated";

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."members" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."members" TO "service_role";

REVOKE ALL ON TABLE "public"."members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."members" TO "postgres";

CREATE TRIGGER enforce_write_limits BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION private.enforce_write_limits();
CREATE TRIGGER track_deleted_rows AFTER DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION private.enforce_write_limits();
CREATE TRIGGER track_inserted_rows AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION private.enforce_write_limits();
