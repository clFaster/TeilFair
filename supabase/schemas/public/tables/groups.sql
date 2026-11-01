CREATE TABLE "public"."groups" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name"        text                     NOT NULL,
  "currency"    text                     NOT NULL DEFAULT 'EUR'::text,
  "read_token"  text                     NOT NULL,
  "write_token" text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "groups_pkey" PRIMARY KEY (id),
  CONSTRAINT "read_token_length" CHECK ((length(read_token) >= 32)),
  CONSTRAINT "tokens_different" CHECK ((read_token <> write_token)),
  CONSTRAINT "write_token_length" CHECK ((length(write_token) >= 32))
);

ALTER TABLE "public"."groups"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_groups_read_token ON public.groups USING btree (read_token);

CREATE INDEX idx_groups_write_token ON public.groups USING btree (write_token);

CREATE POLICY "Anyone can create groups" ON "public"."groups"
  FOR INSERT
  TO PUBLIC
  WITH
    CHECK
    (((length(read_token) >= 32) AND (length(write_token) >= 32) AND (read_token <> write_token) AND (TRIM(BOTH FROM read_token) <> ''::text) AND (TRIM(BOTH FROM write_token) <>
    ''::text)));

CREATE POLICY "Delete groups with write token" ON "public"."groups"
  FOR DELETE
  TO PUBLIC
  USING ((public.get_token() = write_token));

CREATE POLICY "Read groups with valid token" ON "public"."groups"
  FOR SELECT
  TO PUBLIC
  USING (((public.get_token() = read_token) OR (public.get_token() = write_token)));

CREATE POLICY "Update groups with write token" ON "public"."groups"
  FOR UPDATE
  TO PUBLIC
  USING ((public.get_token() = write_token));

REVOKE ALL ON TABLE "public"."groups" FROM "anon";

REVOKE ALL ON TABLE "public"."groups" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "service_role";

REVOKE ALL ("created_at") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("created_at") ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("currency") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("currency") ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("id") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("id") ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("name") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("name") ON TABLE "public"."groups" TO "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("created_at") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("created_at") ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ("currency") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("currency") ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("name") ON TABLE "public"."groups" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ON TABLE "public"."groups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "postgres";
