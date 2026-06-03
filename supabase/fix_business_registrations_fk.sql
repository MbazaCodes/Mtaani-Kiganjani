-- Fix business_registrations.user_id to reference public.users instead of auth.users
-- This allows PostgREST to join business_registrations with users via the REST API

-- Step 1: Drop the old FK constraint
ALTER TABLE public.business_registrations
  DROP CONSTRAINT IF EXISTS business_registrations_user_id_fkey;

-- Step 2: Add new FK pointing to public.users
ALTER TABLE public.business_registrations
  ADD CONSTRAINT business_registrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Do same for reviewed_by (also references auth.users)
ALTER TABLE public.business_registrations
  DROP CONSTRAINT IF EXISTS business_registrations_reviewed_by_fkey;

ALTER TABLE public.business_registrations
  ADD CONSTRAINT business_registrations_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.users(id);
