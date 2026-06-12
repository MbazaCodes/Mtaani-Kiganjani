-- Add profile_complete and verification_level columns if they don't exist
-- Run in Supabase SQL Editor: project xuhilnejpqvbfukyhefi

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name = 'profile_complete') THEN
    ALTER TABLE public.users ADD COLUMN profile_complete BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name = 'profile_completion_pct') THEN
    ALTER TABLE public.users ADD COLUMN profile_completion_pct SMALLINT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name = 'verification_level') THEN
    ALTER TABLE public.users ADD COLUMN verification_level TEXT DEFAULT 'PHONE_VERIFIED'
      CHECK (verification_level IN (
        'UNVERIFIED','PHONE_VERIFIED','EMAIL_VERIFIED',
        'PROFILE_COMPLETED','PENDING_OFFICE_VISIT','NIDA_VERIFIED'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name = 'city_of_residence') THEN
    ALTER TABLE public.users ADD COLUMN city_of_residence TEXT;
  END IF;
END $$;

-- Also fix marital_status CHECK to accept both cases (safety)
-- The schema uses lowercase so ensure values are normalised
CREATE OR REPLACE FUNCTION public.normalise_marital_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.marital_status IS NOT NULL THEN
    NEW.marital_status := LOWER(NEW.marital_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalise_marital ON public.users;
CREATE TRIGGER trg_normalise_marital
  BEFORE INSERT OR UPDATE OF marital_status ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.normalise_marital_status();
