-- Remove all existing policies on admin_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.admin_sessions;
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.admin_sessions;

-- Block ALL direct client access to admin_sessions
-- Only edge functions with service role key can access this table
CREATE POLICY "No direct client access to admin_sessions"
ON public.admin_sessions
FOR ALL
USING (false)
WITH CHECK (false);

-- Add a function to create hashed session tokens
CREATE OR REPLACE FUNCTION public.create_admin_session(
  _user_id UUID,
  _expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Add a function to validate session tokens
CREATE OR REPLACE FUNCTION public.validate_admin_session(_token TEXT)
RETURNS TABLE(user_id UUID, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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