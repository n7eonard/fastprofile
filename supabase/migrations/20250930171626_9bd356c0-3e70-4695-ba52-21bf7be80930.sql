-- Add RLS policies for user_roles table
CREATE POLICY "Service role can manage user roles"
ON public.user_roles
FOR ALL
USING (true)
WITH CHECK (true);

-- Add RLS policies for admin_sessions table
CREATE POLICY "Users can view their own sessions"
ON public.admin_sessions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage sessions"
ON public.admin_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Fix search_path for clean_expired_sessions function
CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.admin_sessions
  WHERE expires_at < now()
$$;