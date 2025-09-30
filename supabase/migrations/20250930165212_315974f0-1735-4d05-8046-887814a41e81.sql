-- Add security constraints to recordings table to prevent abuse

-- Add check constraint for valid question IDs (1-4 based on the onboarding questions)
ALTER TABLE public.recordings 
ADD CONSTRAINT valid_question_id 
CHECK (question_id >= 1 AND question_id <= 4);

-- Add check constraint to ensure audio_url is not empty
ALTER TABLE public.recordings 
ADD CONSTRAINT audio_url_not_empty 
CHECK (audio_url IS NOT NULL AND length(audio_url) > 0);

-- Create an index on created_at to help monitor and detect abuse patterns
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at DESC);

-- Add a comment documenting the security model
COMMENT ON TABLE public.recordings IS 'Anonymous recordings table with client-side validation (10MB limit, audio-only) and database constraints to prevent abuse';