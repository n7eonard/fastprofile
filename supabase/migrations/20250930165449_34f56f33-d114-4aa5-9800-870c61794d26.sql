-- Update constraint to allow question_id = 0 for complete recordings
ALTER TABLE public.recordings 
DROP CONSTRAINT IF EXISTS valid_question_id;

-- Add new constraint: question_id = 0 means complete recording, 1-4 are individual questions
ALTER TABLE public.recordings 
ADD CONSTRAINT valid_question_id 
CHECK (question_id >= 0 AND question_id <= 4);

-- Update table comment to reflect new structure
COMMENT ON TABLE public.recordings IS 'Anonymous recordings table. question_id = 0 indicates a complete recording of all answers. Client-side validation enforces 10MB limit and audio-only files.';