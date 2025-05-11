-- Add created_at column to clips table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'clips'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.clips
    ADD COLUMN created_at timestamp with time zone DEFAULT now();

    -- Update existing rows to have a created_at value
    UPDATE public.clips
    SET created_at = now()
    WHERE created_at IS NULL;
  END IF;
END $$;
