-- Fix verification loop: DB-side defense-in-depth
--
-- Problem: Already-verified users were repeatedly prompted to verify.
-- Root causes on the DB side:
--   1. handle_new_user trigger (20260619) didn't include verification_level
--   2. trg_users_completion trigger didn't watch is_verified column
--   3. verification_level column default was inconsistent

-- ── 1. Fix handle_new_user trigger to include verification_level ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := NEW.raw_user_meta_data;
  v_is_diaspora BOOLEAN := COALESCE((meta->>'is_diaspora')::boolean, FALSE);
  v_level TEXT;
BEGIN
  v_level := COALESCE(
    meta->>'verification_level',
    CASE
      WHEN v_is_diaspora THEN 'EMAIL_VERIFIED'
      WHEN meta->>'phone' IS NOT NULL THEN 'PHONE_VERIFIED'
      ELSE 'UNVERIFIED'
    END
  );

  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name,
    phone, date_of_birth, gender,
    region, district, ward, street,
    nida_number, passport_number,
    is_verified, is_diaspora,
    verification_level,
    role, account_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'first_name', ''),
    COALESCE(meta->>'middle_name', ''),
    COALESCE(meta->>'last_name', ''),
    COALESCE(meta->>'phone', ''),
    COALESCE(meta->>'date_of_birth', '')::date,
    COALESCE(meta->>'gender', ''),
    COALESCE(meta->>'region', ''),
    COALESCE(meta->>'district', ''),
    COALESCE(meta->>'ward', ''),
    COALESCE(meta->>'street', ''),
    COALESCE(meta->>'nida_number', ''),
    COALESCE(meta->>'passport_number', ''),
    COALESCE((meta->>'is_verified')::boolean, FALSE),
    v_is_diaspora,
    v_level,
    COALESCE(meta->>'role', 'citizen'),
    'active'
  ) ON CONFLICT (id) DO UPDATE SET
    verification_level = EXCLUDED.verification_level,
    is_verified      = EXCLUDED.is_verified,
    updated_at       = NOW();

  RETURN NEW;
END;
$$;

-- ── 2. Add is_verified to trg_users_completion trigger watch list ───────
DROP TRIGGER IF EXISTS trg_users_completion ON public.users;

CREATE TRIGGER trg_users_completion
  AFTER UPDATE OF region, district, ward, street, date_of_birth,
                  nida_number, passport_number, phone, gender,
                  country_of_residence, city_of_residence,
                  is_verified
  ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_completion();

-- ── 3. Normalize verification_level column default ──────────────────────
ALTER TABLE public.users ALTER COLUMN verification_level
  SET DEFAULT 'UNVERIFIED';