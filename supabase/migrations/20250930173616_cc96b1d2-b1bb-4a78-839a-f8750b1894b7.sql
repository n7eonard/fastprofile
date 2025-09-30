-- Drop and recreate the create_admin_session function with correct schema access
DROP FUNCTION IF EXISTS public.create_admin_session(uuid, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.create_admin_session(_user_id uuid, _expires_at timestamp with time zone)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  _token TEXT;
  _token_hash TEXT;
BEGIN
  -- Generate a random token (this will be returned to the client)
  _token := encode(gen_random_bytes(32), 'hex');
  
  -- Hash the token before storing (using pgcrypto)
  _token_hash := encode(digest(_token, 'sha256'), 'hex');
  
  -- Store the hashed token
  INSERT INTO public.admin_sessions (user_id, session_token, expires_at)
  VALUES (_user_id, _token_hash, _expires_at);
  
  -- Return the unhashed token (only time client sees it)
  RETURN _token;
END;
$$;

-- Also update validate_admin_session function
DROP FUNCTION IF EXISTS public.validate_admin_session(text);

CREATE OR REPLACE FUNCTION public.validate_admin_session(_token text)
RETURNS TABLE(user_id uuid, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  _token_hash TEXT;
BEGIN
  -- Hash the provided token
  _token_hash := encode(digest(_token, 'sha256'), 'hex');
  
  -- Look up session by hashed token
  RETURN QUERY
  SELECT s.user_id, s.expires_at
  FROM public.admin_sessions s
  WHERE s.session_token = _token_hash
    AND s.expires_at > now()
  LIMIT 1;
END;
$$;