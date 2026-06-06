-- Fix for staff/admin/department users stuck seeing the password-change
-- prompt every login. The prompt was caused by is_verified never persisting
-- (the app used an unauthenticated client, blocked by RLS).
--
-- This marks any staff/admin who already has an active account as verified
-- so they stop seeing the prompt. New accounts created after the code fix
-- will persist correctly on their own.
--
-- Run in Supabase SQL Editor. Safe to re-run.

UPDATE public.users
SET is_verified = TRUE,
    account_status = 'active'
WHERE role IN ('staff', 'admin')
  AND (is_verified IS NULL OR is_verified = FALSE)
  AND account_status = 'active';

-- Optional: if you want ALL existing staff/admin verified regardless of
-- account_status (e.g. they have logged in before), uncomment:
-- UPDATE public.users
-- SET is_verified = TRUE, account_status = 'active'
-- WHERE role IN ('staff', 'admin');
