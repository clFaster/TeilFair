CREATE OR REPLACE FUNCTION public.rotate_group_tokens(
  requested_group_id uuid, new_read_token text, new_write_token text)
RETURNS TABLE(id uuid,name text,currency text,read_token text,write_token text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous public.groups%ROWTYPE;
BEGIN
  SELECT g.* INTO previous FROM public.groups g WHERE g.id=requested_group_id FOR UPDATE;
  IF NOT FOUND OR public.get_token() IS DISTINCT FROM previous.write_token THEN
    RAISE EXCEPTION 'Write access required' USING ERRCODE='42501';
  END IF;
  IF new_read_token IS NULL OR new_write_token IS NULL
     OR new_read_token !~ '^[A-Za-z0-9]{32}$' OR new_write_token !~ '^[A-Za-z0-9]{32}$'
     OR new_read_token=new_write_token
     OR new_read_token IN (previous.read_token,previous.write_token)
     OR new_write_token IN (previous.read_token,previous.write_token) THEN
    RAISE EXCEPTION 'Two fresh, distinct capability tokens are required' USING ERRCODE='22023';
  END IF;
  RETURN QUERY UPDATE public.groups g SET read_token=new_read_token,write_token=new_write_token
    WHERE g.id=requested_group_id
    RETURNING g.id,g.name,g.currency,g.read_token,g.write_token,g.created_at;
END $$;
REVOKE ALL ON FUNCTION public.rotate_group_tokens(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_group_tokens(uuid,text,text) TO anon, authenticated;
