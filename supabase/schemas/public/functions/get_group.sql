CREATE OR REPLACE FUNCTION public.get_group (
  requested_group_id uuid
)
  RETURNS TABLE (
    id          uuid,
    name        text,
    currency    text,
    read_token  text,
    write_token text,
    created_at  timestamp with time zone
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    SELECT g.id, g.name, g.currency, g.read_token,
           CASE WHEN public.get_token() = g.write_token THEN g.write_token ELSE ''::text END,
           g.created_at
    FROM public.groups g
    WHERE g.id = requested_group_id
      AND (public.get_token() = g.read_token OR public.get_token() = g.write_token);
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_group"(uuid) TO "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_group"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_group"(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."get_group"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_group"(uuid) TO "postgres";
