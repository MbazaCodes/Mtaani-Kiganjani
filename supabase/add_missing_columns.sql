-- Add columns that exist in the app but were missing from the initial schema run
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alternative_email TEXT,
  ADD COLUMN IF NOT EXISTS email_address TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT;
