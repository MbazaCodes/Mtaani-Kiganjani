-- ================================================================
-- E-MTAA Consolidated Migration — Fix Scan Issues
-- Date: 2026-06-19
--
-- Fixes:
--   1. Normalises account_status to UPPERCASE (ACTIVE/SUSPENDED/PENDING/INACTIVE)
--   2. Cleans up duplicate/conflicting RLS policies from earlier migrations
-- ================================================================

-- 1. Normalise account_status values to UPPERCASE
UPDATE public.users SET account_status = UPPER(account_status)
  WHERE account_status IS NOT NULL AND account_status != UPPER(account_status);

-- 2. Fix account_status column constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('ACTIVE','SUSPENDED','PENDING','INACTIVE'));

-- 3. Fix account_status default
ALTER TABLE public.users ALTER COLUMN account_status SET DEFAULT 'ACTIVE';

-- 4. Fix handle_new_user trigger to use UPPERCASE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := NEW.raw_user_meta_data;
BEGIN
  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name,
    phone, sex, gender, date_of_birth, place_of_birth,
    marital_status, occupation, education_level,
    nationality, country_of_citizenship,
    nida_number, id_type, id_number,
    region, district, ward, street,
    is_diaspora, country_of_residence, passport_number,
    is_verified, role, account_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'first_name', split_part(NEW.email, '@', 1)),
    meta->>'middle_name',
    COALESCE(meta->>'last_name', ''),
    meta->>'phone',
    meta->>'sex',
    COALESCE(meta->>'gender', meta->>'sex'),
    NULLIF(meta->>'date_of_birth', '')::DATE,
    meta->>'place_of_birth',
    meta->>'marital_status',
    meta->>'occupation',
    meta->>'education_level',
    COALESCE(meta->>'nationality', 'Tanzanian'),
    COALESCE(meta->>'country_of_citizenship', 'Tanzania'),
    meta->>'nida_number',
    meta->>'id_type',
    meta->>'id_number',
    meta->>'region',
    meta->>'district',
    meta->>'ward',
    meta->>'street',
    COALESCE((meta->>'is_diaspora')::BOOLEAN, FALSE),
    meta->>'country_of_residence',
    meta->>'passport_number',
    COALESCE((meta->>'is_verified')::BOOLEAN, FALSE),
    COALESCE((meta->>'role')::user_role, 'citizen'),
    'ACTIVE'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Fix create_citizen_profile RPC to use UPPERCASE
CREATE OR REPLACE FUNCTION public.create_citizen_profile(
  p_id                  UUID,
  p_first_name          TEXT,
  p_middle_name         TEXT DEFAULT NULL,
  p_last_name           TEXT DEFAULT '',
  p_email               TEXT DEFAULT '',
  p_phone               TEXT DEFAULT NULL,
  p_sex                 TEXT DEFAULT NULL,
  p_gender              TEXT DEFAULT NULL,
  p_date_of_birth       DATE DEFAULT NULL,
  p_place_of_birth      TEXT DEFAULT NULL,
  p_marital_status      TEXT DEFAULT NULL,
  p_occupation          TEXT DEFAULT NULL,
  p_education_level     TEXT DEFAULT NULL,
  p_nationality         TEXT DEFAULT 'Tanzanian',
  p_country_of_citizenship TEXT DEFAULT 'Tanzania',
  p_nida_number         TEXT DEFAULT NULL,
  p_id_type             TEXT DEFAULT NULL,
  p_id_number           TEXT DEFAULT NULL,
  p_region              TEXT DEFAULT NULL,
  p_district            TEXT DEFAULT NULL,
  p_ward                TEXT DEFAULT NULL,
  p_street              TEXT DEFAULT NULL,
  p_is_diaspora         BOOLEAN DEFAULT FALSE,
  p_country_of_residence TEXT DEFAULT NULL,
  p_passport_number     TEXT DEFAULT NULL,
  p_is_verified         BOOLEAN DEFAULT FALSE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (
    id, first_name, middle_name, last_name,
    email, phone, sex, gender,
    date_of_birth, place_of_birth,
    marital_status, occupation, education_level,
    nationality, country_of_citizenship,
    nida_number, id_type, id_number,
    region, district, ward, street,
    is_diaspora, country_of_residence, passport_number,
    is_verified, role, account_status
  ) VALUES (
    p_id, p_first_name, p_middle_name, p_last_name,
    p_email, p_phone, p_sex, p_gender,
    p_date_of_birth, p_place_of_birth,
    p_marital_status, p_occupation, p_education_level,
    p_nationality, p_country_of_citizenship,
    p_nida_number, p_id_type, p_id_number,
    p_region, p_district, p_ward, p_street,
    p_is_diaspora, p_country_of_residence, p_passport_number,
    p_is_verified, 'citizen', 'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name            = EXCLUDED.first_name,
    middle_name           = COALESCE(EXCLUDED.middle_name, public.users.middle_name),
    last_name             = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE public.users.last_name END,
    phone                 = COALESCE(EXCLUDED.phone, public.users.phone),
    sex                   = COALESCE(EXCLUDED.sex, public.users.sex),
    gender                = COALESCE(EXCLUDED.gender, public.users.gender),
    date_of_birth         = COALESCE(EXCLUDED.date_of_birth, public.users.date_of_birth),
    place_of_birth        = COALESCE(EXCLUDED.place_of_birth, public.users.place_of_birth),
    marital_status        = COALESCE(EXCLUDED.marital_status, public.users.marital_status),
    occupation            = COALESCE(EXCLUDED.occupation, public.users.occupation),
    education_level       = COALESCE(EXCLUDED.education_level, public.users.education_level),
    nationality           = COALESCE(EXCLUDED.nationality, public.users.nationality),
    country_of_citizenship= COALESCE(EXCLUDED.country_of_citizenship, public.users.country_of_citizenship),
    nida_number           = COALESCE(EXCLUDED.nida_number, public.users.nida_number),
    id_type               = COALESCE(EXCLUDED.id_type, public.users.id_type),
    id_number             = COALESCE(EXCLUDED.id_number, public.users.id_number),
    region                = COALESCE(EXCLUDED.region, public.users.region),
    district              = COALESCE(EXCLUDED.district, public.users.district),
    ward                  = COALESCE(EXCLUDED.ward, public.users.ward),
    street                = COALESCE(EXCLUDED.street, public.users.street),
    is_diaspora           = COALESCE(EXCLUDED.is_diaspora, public.users.is_diaspora),
    country_of_residence  = COALESCE(EXCLUDED.country_of_residence, public.users.country_of_residence),
    passport_number       = COALESCE(EXCLUDED.passport_number, public.users.passport_number),
    is_verified           = COALESCE(EXCLUDED.is_verified, public.users.is_verified),
    updated_at            = NOW()
  WHERE public.users.id = p_id;
END;
$$;

-- 6. Clean up duplicate/conflicting RLS policies
-- Users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
DROP POLICY IF EXISTS "Staff can update users" ON public.users;
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;

-- Applications
DROP POLICY IF EXISTS "Citizens can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Citizens can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Citizens can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Second party can view applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can update applications" ON public.applications;
DROP POLICY IF EXISTS "Public can verify issued applications" ON public.applications;

-- Services
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Staff can manage services" ON public.services;

-- Payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view all payments" ON public.payments;

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
