-- The previous policies won't work because this system doesn't use auth.uid()
-- This is a password-based system with session tokens, not Supabase Auth
-- The correct approach is to block all direct client access and only allow edge functions

-- Drop the policies that rely on auth.uid() (which is always null in this system)
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- Block ALL direct client access to user_roles
-- Only edge functions with service role can access this table
CREATE POLICY "No direct client access to user_roles"
ON public.user_roles
FOR ALL
USING (false)
WITH CHECK (false);