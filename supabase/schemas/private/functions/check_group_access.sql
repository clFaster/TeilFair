CREATE OR REPLACE FUNCTION private.check_group_access (
  group_id      uuid,
  require_write boolean DEFAULT false
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = group_id
          AND (public.get_token() = g.write_token
               OR (NOT require_write AND public.get_token() = g.read_token))
    );
$function$;

GRANT EXECUTE ON FUNCTION "private"."check_group_access"(uuid, boolean) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "private"."check_group_access"(uuid, boolean) FROM PUBLIC;
