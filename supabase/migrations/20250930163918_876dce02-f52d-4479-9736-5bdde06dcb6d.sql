-- Add policy to allow anonymous recording inserts
CREATE POLICY "Allow anonymous recording inserts"
ON public.recordings
FOR INSERT
WITH CHECK (true);

-- Also allow anonymous uploads to the recordings bucket
CREATE POLICY "Allow anonymous uploads to recordings bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'recordings');