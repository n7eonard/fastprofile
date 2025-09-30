-- Allow reading all recordings for the admin recordings page
-- Since recordings are anonymous, we'll allow viewing all of them
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.recordings;

CREATE POLICY "Anyone can view all recordings"
ON public.recordings
FOR SELECT
USING (true);

-- Add comment explaining the security model
COMMENT ON POLICY "Anyone can view all recordings" ON public.recordings IS 'Allows viewing all anonymous recordings for admin purposes';
