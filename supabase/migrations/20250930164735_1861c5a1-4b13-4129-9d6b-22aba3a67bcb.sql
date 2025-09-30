-- Remove the foreign key constraint that's blocking anonymous recordings
ALTER TABLE public.recordings DROP CONSTRAINT IF EXISTS recordings_user_id_fkey;

-- Make user_id nullable to be more flexible
ALTER TABLE public.recordings ALTER COLUMN user_id DROP NOT NULL;