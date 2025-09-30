-- Simplify RLS policies to block all direct client access
-- Edge functions use service role key which bypasses RLS

DROP POLICY IF EXISTS "Admins can view all recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can view whitelist" ON public.whitelist;

-- Block all direct client SELECT access to recordings
-- Edge functions with service role can still access
CREATE POLICY "No direct client access to recordings"
ON public.recordings
FOR SELECT
USING (false);

-- Block all direct client access to whitelist
CREATE POLICY "No direct client access to whitelist"
ON public.whitelist
FOR SELECT
USING (false);