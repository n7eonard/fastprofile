-- Create a whitelist table for allowed users
CREATE TABLE public.whitelist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on whitelist table
ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read the whitelist (to check if they're allowed)
CREATE POLICY "Authenticated users can check whitelist"
ON public.whitelist
FOR SELECT
TO authenticated
USING (true);

-- Create a function to check if a user's email is whitelisted
CREATE OR REPLACE FUNCTION public.is_whitelisted(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whitelist
    WHERE email = user_email
  )
$$;

-- Add index for performance
CREATE INDEX idx_whitelist_email ON public.whitelist(email);

-- Add a comment
COMMENT ON TABLE public.whitelist IS 'Whitelist of emails allowed to access /recordings page';
