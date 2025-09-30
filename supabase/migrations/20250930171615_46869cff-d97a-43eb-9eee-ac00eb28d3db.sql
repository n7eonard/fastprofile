-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create admin_sessions table for secure session management
CREATE TABLE public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Add index for session lookups
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions(expires_at);

-- Create function to validate session
CREATE OR REPLACE FUNCTION public.validate_session(_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.admin_sessions
  WHERE session_token = _token
    AND expires_at > now()
  LIMIT 1
$$;

-- Drop the public access policy on recordings
DROP POLICY IF EXISTS "Anyone can view all recordings" ON public.recordings;

-- Create admin-only policy for recordings
CREATE POLICY "Admins can view all recordings"
ON public.recordings
FOR SELECT
USING (
  public.validate_session(current_setting('request.headers', true)::json->>'x-session-token') IS NOT NULL
);

-- Update whitelist policy to admin-only
DROP POLICY IF EXISTS "Authenticated users can check whitelist" ON public.whitelist;

CREATE POLICY "Admins can view whitelist"
ON public.whitelist
FOR SELECT
USING (
  public.validate_session(current_setting('request.headers', true)::json->>'x-session-token') IS NOT NULL
);

-- Create function to clean expired sessions
CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.admin_sessions
  WHERE expires_at < now()
$$;