CREATE OR REPLACE FUNCTION public.get_token()
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
    SELECT NULLIF(NULLIF(current_setting('request.headers', true), '')::json->>'x-group-token', '');
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_token"() TO "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_token"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_token"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."get_token"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_token"() TO "postgres";
