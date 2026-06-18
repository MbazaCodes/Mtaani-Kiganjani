-- ================================================================
-- E-MTAA COMPLETE DATABASE SETUP
-- Single-pass script — safe on empty Supabase project
-- Run in Supabase Dashboard → SQL Editor
-- Project: xuhilnejpqvbfukyhefi
-- ================================================================

-- ═══ PART 1: V3 Auth, Profiles & Verification ═══
-- ============================================================
-- E-MTAA V3.0 — Auth, Profiles & Verification SQL Migration
-- Covers:
--   1. users table — all columns for signup, login, profile completion
--   2. handle_new_user trigger — auto-creates profile on auth.users insert
--   3. create_citizen_profile RPC — safe upsert from signup flow
--   4. update_profile_completion RPC — recalculates completion %
--   5. get_profile_by_phone RPC — phone-based login lookup
--   6. Verification tier logic + upgrade functions
--   7. RLS policies for users, applications, drafts
--   8. Indexes for fast lookups
-- ============================================================

-- ── 1. USERS TABLE ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  -- Identity
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  first_name      text NOT NULL DEFAULT '',
  middle_name     text,
  last_name       text NOT NULL DEFAULT '',
  phone           text UNIQUE,
  photo_url       text,

  -- Role & Status
  role            text NOT NULL DEFAULT 'citizen'
                  CHECK (role IN ('citizen','staff','admin')),
  account_status  text NOT NULL DEFAULT 'ACTIVE'
                  CHECK (account_status IN ('ACTIVE','SUSPENDED','PENDING','INACTIVE')),
  is_verified     boolean NOT NULL DEFAULT false,
  is_diaspora     boolean NOT NULL DEFAULT false,
  profile_complete boolean NOT NULL DEFAULT false,
  profile_completion_pct smallint NOT NULL DEFAULT 0,

  -- Verification tier (V3)
  verification_level text NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_level IN (
      'UNVERIFIED','PHONE_VERIFIED','EMAIL_VERIFIED',
      'PROFILE_COMPLETED','PENDING_OFFICE_VISIT','NIDA_VERIFIED'
    )),

  -- Personal info
  date_of_birth   date,
  gender          text CHECK (gender IN ('M','F','O')),
  sex             text,
  nationality     text DEFAULT 'Tanzanian',
  country_of_citizenship text DEFAULT 'Tanzania',
  marital_status  text,
  occupation      text,
  education_level text,
  place_of_birth  text,
  tribe           text,
  blood_group     text,
  disability_status text,
  religious_affiliation text,

  -- Identity documents
  nida_number     text UNIQUE,
  passport_number text,
  voter_id_number text,
  driving_license_number text,
  citizen_id      text UNIQUE,
  id_type         text,
  id_number       text,

  -- Tanzania address (residents)
  region          text,
  district        text,
  ward            text,
  street          text,
  house_number    text,
  postal_code     text,
  landmark        text,

  -- Diaspora fields
  country_of_residence text,
  city_of_residence    text,
  diaspora_region      text,
  diaspora_district    text,
  diaspora_ward        text,

  -- Contact
  alternative_phone     text,
  email_address         text,
  alternative_email     text,

  -- Emergency contact
  emergency_contact_name     text,
  emergency_contact_phone    text,
  emergency_contact_relation text,

  -- Business roles
  seller_id   text UNIQUE,
  landlord_id text UNIQUE,
  broker_id   text UNIQUE,

  -- Signatures/stamps
  signature_url text,
  stamp_url     text,

  -- Local officials linkage
  mtaa_executive_officer text,
  ward_councillor        text,
  ward_chairperson       text,

  -- Staff fields
  assigned_region   text,
  assigned_district text,
  office_id         uuid,
  employee_id       text UNIQUE,
  department        text,
  position          text,
  employment_date   date,

  -- Department membership
  is_department_member boolean DEFAULT false,
  department_id        uuid,

  -- Metadata
  email_verified  boolean DEFAULT false,
  phone_verified  boolean DEFAULT false,
  last_login      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns to existing tables (safe with IF NOT EXISTS alternative)
DO $$ BEGIN
  -- verification_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='verification_level') THEN
    ALTER TABLE public.users ADD COLUMN verification_level text NOT NULL DEFAULT 'UNVERIFIED'
      CHECK (verification_level IN ('UNVERIFIED','PHONE_VERIFIED','EMAIL_VERIFIED',
        'PROFILE_COMPLETED','PENDING_OFFICE_VISIT','NIDA_VERIFIED'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='profile_complete') THEN
    ALTER TABLE public.users ADD COLUMN profile_complete boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='profile_completion_pct') THEN
    ALTER TABLE public.users ADD COLUMN profile_completion_pct smallint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='city_of_residence') THEN
    ALTER TABLE public.users ADD COLUMN city_of_residence text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='is_department_member') THEN
    ALTER TABLE public.users ADD COLUMN is_department_member boolean DEFAULT false;
  END IF;
END $$;

-- ── 2. UPDATED_AT TRIGGER ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. HANDLE NEW USER TRIGGER ────────────────────────────────────────────────
-- Fires on every new auth.users row. Creates a minimal profile from metadata.
-- The signup flow also calls create_citizen_profile RPC which fills in more detail.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta jsonb;
  v_level text;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- Derive verification level
  v_level := COALESCE(
    meta->>'verification_level',
    CASE
      WHEN (meta->>'is_diaspora')::boolean = true THEN 'EMAIL_VERIFIED'
      WHEN meta->>'phone' IS NOT NULL               THEN 'PHONE_VERIFIED'
      ELSE 'UNVERIFIED'
    END
  );

  INSERT INTO public.users (
    id, email,
    first_name, middle_name, last_name,
    phone,
    role, account_status,
    is_verified, is_diaspora,
    verification_level,
    nationality, country_of_citizenship,
    nida_number, passport_number,
    id_type, id_number,
    region, district, ward, street, house_number,
    country_of_residence, city_of_residence,
    date_of_birth, gender, sex,
    profile_complete, profile_completion_pct,
    created_at, updated_at
  ) VALUES (
    NEW.id,
    LOWER(NEW.email),
    UPPER(COALESCE(meta->>'first_name', split_part(NEW.email,'@',1))),
    UPPER(NULLIF(TRIM(COALESCE(meta->>'middle_name','')), '')),
    UPPER(COALESCE(meta->>'last_name', '')),
    NULLIF(TRIM(COALESCE(meta->>'phone', '')), ''),
    COALESCE(meta->>'role', 'citizen'),
    COALESCE(meta->>'account_status', 'ACTIVE'),
    COALESCE((meta->>'is_verified')::boolean, false),
    COALESCE((meta->>'is_diaspora')::boolean, false),
    v_level,
    COALESCE(meta->>'nationality', 'Tanzanian'),
    COALESCE(meta->>'country_of_citizenship', 'Tanzania'),
    NULLIF(TRIM(COALESCE(meta->>'nida_number', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'passport_number', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'id_type', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'id_number', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'region', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'district', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'ward', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'street', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'house_number', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'country_of_residence', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'city_of_residence', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'date_of_birth', '')), '')::date,
    NULLIF(TRIM(COALESCE(meta->>'gender', '')), ''),
    NULLIF(TRIM(COALESCE(meta->>'sex', '')), ''),
    false, 0,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name  = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name   = EXCLUDED.last_name,
    phone       = COALESCE(EXCLUDED.phone, users.phone),
    verification_level = EXCLUDED.verification_level,
    is_verified = EXCLUDED.is_verified,
    is_diaspora = EXCLUDED.is_diaspora,
    updated_at  = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. PROFILE COMPLETION CALCULATOR ─────────────────────────────────────────
-- Returns 0-100. Called after profile save to update profile_completion_pct.

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  u public.users%ROWTYPE;
  score smallint := 0;
  total smallint := 10;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF u.first_name  <> '' AND u.first_name IS NOT NULL  THEN score := score + 1; END IF;
  IF u.last_name   <> '' AND u.last_name IS NOT NULL   THEN score := score + 1; END IF;
  IF u.phone IS NOT NULL OR u.is_diaspora                THEN score := score + 1; END IF;
  IF u.email IS NOT NULL                                 THEN score := score + 1; END IF;
  IF u.region IS NOT NULL OR u.country_of_residence IS NOT NULL THEN score := score + 1; END IF;
  IF u.district IS NOT NULL OR u.city_of_residence IS NOT NULL  THEN score := score + 1; END IF;
  IF u.ward IS NOT NULL OR u.diaspora_ward IS NOT NULL           THEN score := score + 1; END IF;
  IF u.street IS NOT NULL                                        THEN score := score + 1; END IF;
  IF u.date_of_birth IS NOT NULL                                 THEN score := score + 1; END IF;
  IF u.nida_number IS NOT NULL OR u.passport_number IS NOT NULL  THEN score := score + 1; END IF;

  RETURN (score * 100 / total)::smallint;
END;
$$;

-- ── 5. UPDATE PROFILE COMPLETION ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_profile_completion(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  pct smallint;
  v_level text;
  u public.users%ROWTYPE;
BEGIN
  pct := public.calculate_profile_completion(p_user_id);
  SELECT * INTO u FROM public.users WHERE id = p_user_id;

  -- Upgrade verification level if earned
  v_level := u.verification_level;
  IF u.nida_number IS NOT NULL AND u.is_verified THEN
    v_level := 'NIDA_VERIFIED';
  ELSIF pct >= 70 AND v_level IN ('PHONE_VERIFIED','EMAIL_VERIFIED') THEN
    v_level := 'PROFILE_COMPLETED';
  END IF;

  UPDATE public.users SET
    profile_completion_pct = pct,
    profile_complete = (pct >= 60),
    verification_level = v_level,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Trigger: auto-recalculate after every profile update
CREATE OR REPLACE FUNCTION public.trg_recalc_completion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.update_profile_completion(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_completion ON public.users;
CREATE TRIGGER trg_users_completion
  AFTER UPDATE OF region, district, ward, street, date_of_birth,
                  nida_number, passport_number, phone, gender,
                  country_of_residence, city_of_residence
  ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_completion();

-- ── 6. CREATE CITIZEN PROFILE RPC ─────────────────────────────────────────────
-- Called from Auth.tsx signup after supabase.auth.signUp succeeds.
-- Safe upsert — won't fail if trigger already created the row.

CREATE OR REPLACE FUNCTION public.create_citizen_profile(
  p_id                    uuid,
  p_email                 text      DEFAULT NULL,
  p_first_name            text      DEFAULT NULL,
  p_middle_name           text      DEFAULT NULL,
  p_last_name             text      DEFAULT NULL,
  p_phone                 text      DEFAULT NULL,
  p_sex                   text      DEFAULT NULL,
  p_gender                text      DEFAULT NULL,
  p_date_of_birth         text      DEFAULT NULL,
  p_place_of_birth        text      DEFAULT NULL,
  p_marital_status        text      DEFAULT NULL,
  p_occupation            text      DEFAULT NULL,
  p_education_level       text      DEFAULT NULL,
  p_nationality           text      DEFAULT 'Tanzanian',
  p_country_of_citizenship text     DEFAULT 'Tanzania',
  p_nida_number           text      DEFAULT NULL,
  p_id_type               text      DEFAULT NULL,
  p_id_number             text      DEFAULT NULL,
  p_region                text      DEFAULT NULL,
  p_district              text      DEFAULT NULL,
  p_ward                  text      DEFAULT NULL,
  p_street                text      DEFAULT NULL,
  p_house_number          text      DEFAULT NULL,
  p_is_diaspora           boolean   DEFAULT false,
  p_country_of_residence  text      DEFAULT NULL,
  p_city_of_residence     text      DEFAULT NULL,
  p_passport_number       text      DEFAULT NULL,
  p_is_verified           boolean   DEFAULT true,
  p_verification_level    text      DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_level text;
BEGIN
  v_level := COALESCE(
    p_verification_level,
    CASE
      WHEN p_nida_number IS NOT NULL AND p_is_verified THEN 'NIDA_VERIFIED'
      WHEN p_is_diaspora                                THEN 'EMAIL_VERIFIED'
      WHEN p_phone IS NOT NULL                          THEN 'PHONE_VERIFIED'
      ELSE 'UNVERIFIED'
    END
  );

  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name,
    phone, sex, gender, date_of_birth, place_of_birth,
    marital_status, occupation, education_level,
    nationality, country_of_citizenship,
    nida_number, id_type, id_number,
    region, district, ward, street, house_number,
    is_diaspora, country_of_residence, city_of_residence,
    passport_number,
    role, is_verified, verification_level, account_status,
    profile_complete, profile_completion_pct,
    created_at, updated_at
  )
  VALUES (
    p_id,
    LOWER(COALESCE(p_email, '')),
    UPPER(COALESCE(p_first_name, '')),
    UPPER(NULLIF(TRIM(COALESCE(p_middle_name, '')), '')),
    UPPER(COALESCE(p_last_name, '')),
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    p_sex, p_gender,
    NULLIF(TRIM(COALESCE(p_date_of_birth, '')), '')::date,
    p_place_of_birth, p_marital_status, p_occupation, p_education_level,
    COALESCE(p_nationality, 'Tanzanian'),
    COALESCE(p_country_of_citizenship, 'Tanzania'),
    NULLIF(TRIM(COALESCE(p_nida_number, '')), ''),
    p_id_type, p_id_number,
    NULLIF(TRIM(COALESCE(p_region, '')), ''),
    NULLIF(TRIM(COALESCE(p_district, '')), ''),
    NULLIF(TRIM(COALESCE(p_ward, '')), ''),
    NULLIF(TRIM(COALESCE(p_street, '')), ''),
    NULLIF(TRIM(COALESCE(p_house_number, '')), ''),
    COALESCE(p_is_diaspora, false),
    NULLIF(TRIM(COALESCE(p_country_of_residence, '')), ''),
    NULLIF(TRIM(COALESCE(p_city_of_residence, '')), ''),
    NULLIF(TRIM(COALESCE(p_passport_number, '')), ''),
    'citizen',
    COALESCE(p_is_verified, true),
    v_level,
    'ACTIVE',
    false, 0,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name            = COALESCE(EXCLUDED.first_name, users.first_name),
    middle_name           = COALESCE(EXCLUDED.middle_name, users.middle_name),
    last_name             = COALESCE(NULLIF(EXCLUDED.last_name,''), users.last_name),
    phone                 = COALESCE(EXCLUDED.phone, users.phone),
    sex                   = COALESCE(EXCLUDED.sex, users.sex),
    gender                = COALESCE(EXCLUDED.gender, users.gender),
    date_of_birth         = COALESCE(EXCLUDED.date_of_birth, users.date_of_birth),
    nationality           = COALESCE(EXCLUDED.nationality, users.nationality),
    nida_number           = COALESCE(EXCLUDED.nida_number, users.nida_number),
    id_type               = COALESCE(EXCLUDED.id_type, users.id_type),
    id_number             = COALESCE(EXCLUDED.id_number, users.id_number),
    region                = COALESCE(EXCLUDED.region, users.region),
    district              = COALESCE(EXCLUDED.district, users.district),
    ward                  = COALESCE(EXCLUDED.ward, users.ward),
    street                = COALESCE(EXCLUDED.street, users.street),
    house_number          = COALESCE(EXCLUDED.house_number, users.house_number),
    is_diaspora           = EXCLUDED.is_diaspora,
    country_of_residence  = COALESCE(EXCLUDED.country_of_residence, users.country_of_residence),
    city_of_residence     = COALESCE(EXCLUDED.city_of_residence, users.city_of_residence),
    passport_number       = COALESCE(EXCLUDED.passport_number, users.passport_number),
    verification_level    = CASE
      WHEN EXCLUDED.verification_level = 'NIDA_VERIFIED' THEN 'NIDA_VERIFIED'
      WHEN users.verification_level    = 'NIDA_VERIFIED' THEN 'NIDA_VERIFIED'
      ELSE COALESCE(EXCLUDED.verification_level, users.verification_level)
    END,
    is_verified           = COALESCE(EXCLUDED.is_verified, users.is_verified),
    updated_at            = now();

  -- Recalculate completion after insert/update
  PERFORM public.update_profile_completion(p_id);
END;
$$;

-- ── 7. PHONE-BASED LOGIN LOOKUP ───────────────────────────────────────────────
-- Auth.tsx phone login: looks up email by phone, then calls signInWithPassword

CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS TABLE(email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT u.email FROM public.users u
    WHERE u.phone = p_phone
       OR u.phone = '+255' || REGEXP_REPLACE(p_phone, '^(0|\+255)', '')
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;

-- ── 8. UPGRADE VERIFICATION TIER ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upgrade_verification_tier(
  p_user_id uuid,
  p_tier    text  -- 'PHONE_VERIFIED'|'EMAIL_VERIFIED'|'PROFILE_COMPLETED'|'PENDING_OFFICE_VISIT'|'NIDA_VERIFIED'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET
    verification_level = p_tier,
    is_verified = (p_tier IN ('PHONE_VERIFIED','EMAIL_VERIFIED','PROFILE_COMPLETED','PENDING_OFFICE_VISIT','NIDA_VERIFIED')),
    updated_at = now()
  WHERE id = p_user_id;

  PERFORM public.update_profile_completion(p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_verification_tier(uuid, text) TO authenticated;

-- ── 9. APPLICATIONS TABLE COLUMNS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id         text NOT NULL,
  service_name       text NOT NULL,
  application_number text UNIQUE NOT NULL,
  status             text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','pending_review','pending_payment','paid','verified',
                      'approved','issued','returned','rejected','refunded')),
  form_data          jsonb NOT NULL DEFAULT '{}',
  feedback           text,
  region             text,
  district           text,
  ward               text,
  street             text,
  assigned_staff_id  uuid REFERENCES public.users(id),
  target_user_id     uuid REFERENCES public.users(id),
  target_user_nida   text,
  target_user_role   text,
  second_party_user_id uuid REFERENCES public.users(id),
  agreement_status   text,
  payment_data       jsonb,
  confirmation_data  jsonb,
  is_confirmed       boolean DEFAULT false,
  buyer_accepted     boolean,
  tenant_accepted    boolean,
  approved_by        uuid REFERENCES public.users(id),
  rejected_by        uuid REFERENCES public.users(id),
  returned_by        uuid REFERENCES public.users(id),
  issued_by          uuid REFERENCES public.users(id),
  verified_by        uuid REFERENCES public.users(id),
  approved_at        timestamptz,
  paid_at            timestamptz,
  issued_at          timestamptz,
  verified_at        timestamptz,
  -- V3 officer checklist columns
  checklist_phone_verified   boolean DEFAULT false,
  checklist_address_verified boolean DEFAULT false,
  checklist_id_verified      boolean DEFAULT false,
  checklist_witnesses_added  boolean DEFAULT false,
  checklist_final_approved   boolean DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Add checklist columns to existing tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='applications' AND column_name='checklist_phone_verified') THEN
    ALTER TABLE public.applications
      ADD COLUMN checklist_phone_verified   boolean DEFAULT false,
      ADD COLUMN checklist_address_verified boolean DEFAULT false,
      ADD COLUMN checklist_id_verified      boolean DEFAULT false,
      ADD COLUMN checklist_witnesses_added  boolean DEFAULT false,
      ADD COLUMN checklist_final_approved   boolean DEFAULT false;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 10. APPLICATION NUMBER GENERATOR ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'APP-' || TO_CHAR(now(), 'YYYYMMDD') || '-' ||
         LPAD(FLOOR(RANDOM() * 99999)::text, 5, '0');
END;
$$;

-- ── 11. RLS POLICIES ─────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Users: own row full access
DROP POLICY IF EXISTS "users_select_own"  ON public.users;
DROP POLICY IF EXISTS "users_insert_own"  ON public.users;
DROP POLICY IF EXISTS "users_update_own"  ON public.users;
DROP POLICY IF EXISTS "users_staff_select" ON public.users;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Staff/admin: can read all citizens
DROP POLICY IF EXISTS "users_staff_select" ON public.users;
DROP POLICY IF EXISTS "users_staff_select" ON public.users;
CREATE POLICY "users_staff_select" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('staff','admin')
    )
  );

-- Staff/admin: can update citizens (for verification upgrades)
DROP POLICY IF EXISTS "users_staff_update" ON public.users;
DROP POLICY IF EXISTS "users_staff_update" ON public.users;
CREATE POLICY "users_staff_update" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('staff','admin')
    )
  );

-- Applications: citizen sees own, staff/admin sees all in their region
DROP POLICY IF EXISTS "applications_select_own"   ON public.applications;
DROP POLICY IF EXISTS "applications_insert_own"   ON public.applications;
DROP POLICY IF EXISTS "applications_update_own"   ON public.applications;
DROP POLICY IF EXISTS "applications_staff_select" ON public.applications;
DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;

DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT USING (user_id = auth.uid() OR second_party_user_id = auth.uid());

DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "applications_staff_select" ON public.applications;
DROP POLICY IF EXISTS "applications_staff_select" ON public.applications;
CREATE POLICY "applications_staff_select" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('staff','admin'))
  );

DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;
DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;
CREATE POLICY "applications_staff_update" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('staff','admin'))
  );

-- ── 12. INDEXES ───────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "idx_users_phone";
CREATE INDEX IF NOT EXISTS idx_users_phone   ON public.users(phone);
DROP INDEX IF EXISTS "idx_users_email";
CREATE INDEX IF NOT EXISTS idx_users_email   ON public.users(email);
DROP INDEX IF EXISTS "idx_users_nida";
CREATE INDEX IF NOT EXISTS idx_users_nida    ON public.users(nida_number);
DROP INDEX IF EXISTS "idx_users_role";
CREATE INDEX IF NOT EXISTS idx_users_role    ON public.users(role);
DROP INDEX IF EXISTS "idx_users_region";
CREATE INDEX IF NOT EXISTS idx_users_region  ON public.users(region);
DROP INDEX IF EXISTS "idx_users_verification";
CREATE INDEX IF NOT EXISTS idx_users_verification ON public.users(verification_level);
DROP INDEX IF EXISTS "idx_applications_user";
CREATE INDEX IF NOT EXISTS idx_applications_user    ON public.applications(user_id);
DROP INDEX IF EXISTS "idx_applications_status";
CREATE INDEX IF NOT EXISTS idx_applications_status  ON public.applications(status);
DROP INDEX IF EXISTS "idx_applications_service";
CREATE INDEX IF NOT EXISTS idx_applications_service ON public.applications(service_name);
DROP INDEX IF EXISTS "idx_applications_region";
CREATE INDEX IF NOT EXISTS idx_applications_region  ON public.applications(region);
DROP INDEX IF EXISTS "idx_applications_number";
CREATE INDEX IF NOT EXISTS idx_applications_number  ON public.applications(application_number);

-- ── 13. GRANTS ────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT SELECT ON public.users TO anon;

GRANT EXECUTE ON FUNCTION public.create_citizen_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_completion TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_verification_tier TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_application_number TO authenticated;

-- ── 14. SERVICES TABLE ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text UNIQUE NOT NULL,
  name_en      text,
  description  text,
  description_en text,
  fee          numeric(12,2) NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS "idx_services_active";
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_select_all" ON public.services;
DROP POLICY IF EXISTS "services_select_all" ON public.services;
CREATE POLICY "services_select_all" ON public.services FOR SELECT USING (true);
DROP POLICY IF EXISTS "services_staff_write" ON public.services;
DROP POLICY IF EXISTS "services_staff_write" ON public.services;
CREATE POLICY "services_staff_write" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('staff','admin'))
  );

GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;

-- ── DONE ──────────────────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor (Project: xuhilnejpqvbfukyhefi)
-- Safe to run multiple times — all DDL uses IF NOT EXISTS / CREATE OR REPLACE

-- ── UPDATE: get_email_by_phone — try all number formats ──────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS TABLE(email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_digits text;
  v_e164   text;
  v_local  text;
  v_short  text;
BEGIN
  -- Strip non-digits
  v_digits := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');

  -- Build E.164: +255XXXXXXXXX
  v_e164 := CASE
    WHEN LEFT(v_digits, 3) = '255' THEN '+' || v_digits
    WHEN LEFT(v_digits, 1) = '0'   THEN '+255' || SUBSTRING(v_digits, 2)
    WHEN LENGTH(v_digits) = 9      THEN '+255' || v_digits
    ELSE p_phone
  END;

  -- Local: 0XXXXXXXXX
  v_local := CASE
    WHEN LEFT(v_digits, 3) = '255' THEN '0' || SUBSTRING(v_digits, 4)
    WHEN LEFT(v_digits, 1) = '0'   THEN v_digits
    ELSE '0' || v_digits
  END;

  -- Short: 9-digit no prefix
  v_short := CASE
    WHEN LEFT(v_digits, 3) = '255' THEN SUBSTRING(v_digits, 4)
    WHEN LEFT(v_digits, 1) = '0'   THEN SUBSTRING(v_digits, 2)
    ELSE v_digits
  END;

  RETURN QUERY
    SELECT u.email FROM public.users u
    WHERE u.phone IN (v_e164, v_local, v_digits, '+' || v_digits, v_short)
       OR u.phone LIKE '%' || v_short
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;


-- ═══ PART 2: Full RLS Policies (notifications, agreements, biz_reg, etc.) ═══
-- ═══════════════════════════════════════════════════════════════════
-- E-MTAA Row Level Security Policies
-- 
-- Ensures:
--   • Citizens see only their own data
--   • Staff see data in their assigned region/district
--   • Admin sees everything
--   • Applications visible to applicant + assigned staff + admin
--   • Notifications visible only to the intended recipient
--   • Business registrations visible to owner + staff/admin
-- ═══════════════════════════════════════════════════════════════════

-- ── Helper function: check if current user is admin ──────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: check if current user is staff or admin ────
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════════
-- 1. USERS / PROFILES TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Citizens can read their own profile
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Citizens can update their own profile
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Staff can read all citizens (needed for verification, support, review)
DROP POLICY IF EXISTS "users_select_staff" ON public.users;
DROP POLICY IF EXISTS "users_select_staff" ON public.users;
CREATE POLICY "users_select_staff" ON public.users
  FOR SELECT USING (public.is_staff_or_admin());

-- Admin can update any user (role changes, verification, etc.)
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.is_admin());

-- Service creation (signup) — allow insert for authenticated users
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════════
-- 2. PROFILES TABLE (if separate from users)
-- ══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Citizen reads own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    
    -- Citizen updates own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
    
    -- Staff/admin can read all profiles (for buyer/tenant lookup in Sales/Rental)
DROP POLICY IF EXISTS "profiles_select_staff" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_staff" ON public.profiles;
    CREATE POLICY "profiles_select_staff" ON public.profiles
      FOR SELECT USING (public.is_staff_or_admin());

    -- Insert own profile
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
    CREATE POLICY "profiles_insert_self" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);

    -- Allow authenticated users to search by NIDA/phone (for agreement counterparty lookup)
    -- This is safe because the search only returns basic public fields
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
    CREATE POLICY "profiles_select_authenticated" ON public.profiles
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- 3. APPLICATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Citizen can read their own applications
DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);

-- Citizen can insert their own applications
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff/admin can read all applications
DROP POLICY IF EXISTS "applications_select_staff" ON public.applications;
DROP POLICY IF EXISTS "applications_select_staff" ON public.applications;
CREATE POLICY "applications_select_staff" ON public.applications
  FOR SELECT USING (public.is_staff_or_admin());

-- Staff/admin can update applications (approve, reject, etc.)
DROP POLICY IF EXISTS "applications_update_staff" ON public.applications;
DROP POLICY IF EXISTS "applications_update_staff" ON public.applications;
CREATE POLICY "applications_update_staff" ON public.applications
  FOR UPDATE USING (public.is_staff_or_admin());

-- Citizen can update own application (for buyer_accepted / tenant_accepted)
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE USING (auth.uid() = user_id);

-- Also allow target_user to update (counterparty acceptance)
DROP POLICY IF EXISTS "applications_update_target" ON public.applications;
DROP POLICY IF EXISTS "applications_update_target" ON public.applications;
CREATE POLICY "applications_update_target" ON public.applications
  FOR UPDATE USING (auth.uid() = target_user_id);

-- ══════════════════════════════════════════════════════════════════
-- 4. NOTIFICATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User can only see their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- User can update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Any authenticated user can insert notifications (forms create notifications for others)
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
CREATE POLICY "notifications_insert_auth" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Staff/admin can read all notifications (for support)
DROP POLICY IF EXISTS "notifications_select_staff" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_staff" ON public.notifications;
CREATE POLICY "notifications_select_staff" ON public.notifications
  FOR SELECT USING (public.is_staff_or_admin());

-- ══════════════════════════════════════════════════════════════════
-- 5. AGREEMENT_NOTIFICATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.agreement_notifications ENABLE ROW LEVEL SECURITY;

-- Recipient can see their agreement notifications
DROP POLICY IF EXISTS "agreement_notifs_select_recipient" ON public.agreement_notifications;
DROP POLICY IF EXISTS "agreement_notifs_select_recipient" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_recipient" ON public.agreement_notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- Sender can see what they sent
DROP POLICY IF EXISTS "agreement_notifs_select_sender" ON public.agreement_notifications;
DROP POLICY IF EXISTS "agreement_notifs_select_sender" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_sender" ON public.agreement_notifications
  FOR SELECT USING (auth.uid() = sender_id);

-- Recipient can update (accept/reject)
DROP POLICY IF EXISTS "agreement_notifs_update_recipient" ON public.agreement_notifications;
DROP POLICY IF EXISTS "agreement_notifs_update_recipient" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_update_recipient" ON public.agreement_notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Any authenticated user can insert (seller/landlord creates for buyer/tenant)
DROP POLICY IF EXISTS "agreement_notifs_insert_auth" ON public.agreement_notifications;
DROP POLICY IF EXISTS "agreement_notifs_insert_auth" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_insert_auth" ON public.agreement_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Staff/admin can read all
DROP POLICY IF EXISTS "agreement_notifs_select_staff" ON public.agreement_notifications;
DROP POLICY IF EXISTS "agreement_notifs_select_staff" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_staff" ON public.agreement_notifications
  FOR SELECT USING (public.is_staff_or_admin());

-- ══════════════════════════════════════════════════════════════════
-- 6. BUSINESS_REGISTRATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;

-- Citizen can read their own registrations
DROP POLICY IF EXISTS "bizreg_select_own" ON public.business_registrations;
DROP POLICY IF EXISTS "bizreg_select_own" ON public.business_registrations;
CREATE POLICY "bizreg_select_own" ON public.business_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- Citizen can insert their own registrations
DROP POLICY IF EXISTS "bizreg_insert_own" ON public.business_registrations;
DROP POLICY IF EXISTS "bizreg_insert_own" ON public.business_registrations;
CREATE POLICY "bizreg_insert_own" ON public.business_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff/admin can read all registrations
DROP POLICY IF EXISTS "bizreg_select_staff" ON public.business_registrations;
DROP POLICY IF EXISTS "bizreg_select_staff" ON public.business_registrations;
CREATE POLICY "bizreg_select_staff" ON public.business_registrations
  FOR SELECT USING (public.is_staff_or_admin());

-- Staff/admin can update registrations (approve/reject)
DROP POLICY IF EXISTS "bizreg_update_staff" ON public.business_registrations;
DROP POLICY IF EXISTS "bizreg_update_staff" ON public.business_registrations;
CREATE POLICY "bizreg_update_staff" ON public.business_registrations
  FOR UPDATE USING (public.is_staff_or_admin());

-- ══════════════════════════════════════════════════════════════════
-- 7. SERVICES TABLE (public read for all, admin write)
-- ══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services' AND table_schema = 'public') THEN
    ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
    
    -- Everyone can read services
DROP POLICY IF EXISTS "services_select_all" ON public.services;
    DROP POLICY IF EXISTS "services_select_all" ON public.services;
    CREATE POLICY "services_select_all" ON public.services
      FOR SELECT USING (true);
    
    -- Only admin can modify services
DROP POLICY IF EXISTS "services_modify_admin" ON public.services;
    DROP POLICY IF EXISTS "services_modify_admin" ON public.services;
    CREATE POLICY "services_modify_admin" ON public.services
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- 8. ACTIVITY_LOGS TABLE
-- ══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public') THEN
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
    
    -- Only admin can read logs
DROP POLICY IF EXISTS "logs_select_admin" ON public.activity_logs;
    DROP POLICY IF EXISTS "logs_select_admin" ON public.activity_logs;
    CREATE POLICY "logs_select_admin" ON public.activity_logs
      FOR SELECT USING (public.is_admin());
    
    -- Any authenticated user can insert logs
DROP POLICY IF EXISTS "logs_insert_auth" ON public.activity_logs;
    DROP POLICY IF EXISTS "logs_insert_auth" ON public.activity_logs;
    CREATE POLICY "logs_insert_auth" ON public.activity_logs
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- 9. STORAGE POLICIES (documents bucket)
-- ══════════════════════════════════════════════════════════════════
-- Citizens can upload to their own folder
-- Staff/admin can read all documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    -- Upload policy: citizen can upload to business-docs/{their_id}/
DROP POLICY IF EXISTS "storage_upload_own" ON storage.objects;
    DROP POLICY IF EXISTS "storage_upload_own" ON storage.objects;
    CREATE POLICY "storage_upload_own" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = 'business-docs' AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
    
    -- Read policy: owner can read their own files
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
    DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
    CREATE POLICY "storage_select_own" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
    
    -- Staff/admin can read all documents
DROP POLICY IF EXISTS "storage_select_staff" ON storage.objects;
    DROP POLICY IF EXISTS "storage_select_staff" ON storage.objects;
    CREATE POLICY "storage_select_staff" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'documents' AND
        public.is_staff_or_admin()
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage policies skipped (storage extension may not be available)';
END $$;

-- ══════════════════════════════════════════════════════════════════
-- 10. LOCATIONS TABLE (public read, admin write)
-- ══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations' AND table_schema = 'public') THEN
    ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
    
DROP POLICY IF EXISTS "locations_select_all" ON public.locations;
    DROP POLICY IF EXISTS "locations_select_all" ON public.locations;
    CREATE POLICY "locations_select_all" ON public.locations
      FOR SELECT USING (true);
    
DROP POLICY IF EXISTS "locations_modify_admin" ON public.locations;
    DROP POLICY IF EXISTS "locations_modify_admin" ON public.locations;
    CREATE POLICY "locations_modify_admin" ON public.locations
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- Done. Run this in Supabase Dashboard → SQL Editor.


-- ═══ PART 3: Office Registry Module (Phase 2) ═══
-- ════════════════════════════════════════════════════════════════════════════
-- OFFICE REGISTRY MODULE — Phase 2
-- Run in Supabase SQL Editor: project xuhilnejpqvbfukyhefi
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Rebuild offices table with full hierarchy support ──────────────────────
-- Office levels: regional → district → ward → mtaa (street/village) + department
CREATE TABLE IF NOT EXISTS public.office_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code     TEXT UNIQUE NOT NULL,                 -- e.g. DSM-ILA-KAR-Mchikichini-001
  name            TEXT NOT NULL,
  name_sw         TEXT,
  name_en         TEXT,
  office_type     TEXT NOT NULL CHECK (office_type IN ('regional','district','ward','mtaa','department')),
  -- Hierarchy
  parent_id       UUID REFERENCES public.office_registry(id) ON DELETE SET NULL,
  -- Location
  region          TEXT,
  district        TEXT,
  ward            TEXT,
  mtaa            TEXT,                                  -- street / village name
  -- Department-specific (when office_type = 'department')
  department_type TEXT,                                  -- e.g. 'police','health','land'
  -- Contact
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  -- Officer-in-charge
  head_officer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  head_officer_name TEXT,
  -- Streets served (for mtaa offices) — array of street names
  served_streets  TEXT[] DEFAULT '{}',
  -- Status
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL
);

DROP INDEX IF EXISTS "idx_office_registry_type";
CREATE INDEX IF NOT EXISTS idx_office_registry_type   ON public.office_registry(office_type);
DROP INDEX IF EXISTS "idx_office_registry_parent";
CREATE INDEX IF NOT EXISTS idx_office_registry_parent ON public.office_registry(parent_id);
DROP INDEX IF EXISTS "idx_office_registry_region";
CREATE INDEX IF NOT EXISTS idx_office_registry_region ON public.office_registry(region);
DROP INDEX IF EXISTS "idx_office_registry_active";
CREATE INDEX IF NOT EXISTS idx_office_registry_active ON public.office_registry(active);
DROP INDEX IF EXISTS "idx_office_registry_streets";
CREATE INDEX IF NOT EXISTS idx_office_registry_streets ON public.office_registry USING GIN(served_streets);

-- ── 2. Citizen / application office assignment columns ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='assigned_office_id') THEN
    ALTER TABLE public.users ADD COLUMN assigned_office_id UUID REFERENCES public.office_registry(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='office_registry_id') THEN
    ALTER TABLE public.applications ADD COLUMN office_registry_id UUID REFERENCES public.office_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS "idx_users_assigned_office";
CREATE INDEX IF NOT EXISTS idx_users_assigned_office ON public.users(assigned_office_id);

-- ── 3. Server-side office code generation ────────────────────────────────────
-- Format: {RegionAbbr}-{DistrictAbbr}-{WardAbbr}-{MtaaName}-{Serial}
CREATE OR REPLACE FUNCTION public.generate_office_code(
  p_office_type TEXT,
  p_region TEXT,
  p_district TEXT DEFAULT NULL,
  p_ward TEXT DEFAULT NULL,
  p_mtaa TEXT DEFAULT NULL,
  p_department_type TEXT DEFAULT NULL
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_reg  TEXT;
  v_dist TEXT;
  v_ward TEXT;
  v_mtaa TEXT;
  v_prefix TEXT;
  v_serial INT;
  v_code TEXT;
BEGIN
  -- 3-letter uppercase abbreviations
  v_reg  := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_region, 'XXX'), '[^a-zA-Z]', '', 'g'), 3));
  v_dist := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_district, ''), '[^a-zA-Z]', '', 'g'), 3));
  v_ward := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_ward, ''), '[^a-zA-Z]', '', 'g'), 3));
  -- Mtaa keeps its name (cleaned, capitalised first letter)
  v_mtaa := REGEXP_REPLACE(COALESCE(p_mtaa, ''), '[^a-zA-Z0-9]', '', 'g');

  -- Build prefix by office type
  v_prefix := CASE p_office_type
    WHEN 'regional'   THEN v_reg || '-Regional'
    WHEN 'district'   THEN v_reg || '-' || v_dist || '-District'
    WHEN 'ward'       THEN v_reg || '-' || v_dist || '-' || v_ward || '-Ward'
    WHEN 'mtaa'       THEN v_reg || '-' || v_dist || '-' || v_ward || '-' || v_mtaa
    WHEN 'department' THEN v_reg || '-' || v_dist || '-' || v_ward || '-' || UPPER(LEFT(COALESCE(p_department_type,'DEP'),4))
    ELSE v_reg
  END;

  -- Next serial for this prefix
  SELECT COALESCE(MAX(CAST(RIGHT(office_code, 3) AS INT)), 0) + 1
  INTO v_serial
  FROM public.office_registry
  WHERE office_code LIKE v_prefix || '-%'
    AND RIGHT(office_code, 3) ~ '^[0-9]{3}$';

  v_code := v_prefix || '-' || LPAD(v_serial::TEXT, 3, '0');
  RETURN v_code;
END;
$$;

-- Auto-assign office_code on insert if not provided
CREATE OR REPLACE FUNCTION public.set_office_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.office_code IS NULL OR NEW.office_code = '' THEN
    NEW.office_code := public.generate_office_code(
      NEW.office_type, NEW.region, NEW.district, NEW.ward, NEW.mtaa, NEW.department_type
    );
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_office_code ON public.office_registry;
CREATE TRIGGER trg_set_office_code
  BEFORE INSERT OR UPDATE ON public.office_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_office_code();

-- ── 4. Street → office assignment lookup ─────────────────────────────────────
-- Given a citizen's region/district/ward/street, find the best office:
--   1. Mtaa office whose served_streets contains the street
--   2. Mtaa office matching mtaa name
--   3. Fallback: Ward office
--   4. Fallback: District office → Regional office
CREATE OR REPLACE FUNCTION public.find_office_for_address(
  p_region TEXT, p_district TEXT, p_ward TEXT, p_street TEXT
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
  -- 1. Mtaa office serving this street
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='mtaa' AND active
    AND region=p_region AND district=p_district AND ward=p_ward
    AND p_street = ANY(served_streets)
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 2. Mtaa office matching mtaa name = street
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='mtaa' AND active
    AND region=p_region AND district=p_district AND ward=p_ward
    AND (mtaa ILIKE p_street OR mtaa ILIKE '%'||p_street||'%')
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 3. Ward office
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='ward' AND active
    AND region=p_region AND district=p_district AND ward=p_ward
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 4. District office
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='district' AND active
    AND region=p_region AND district=p_district
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 5. Regional office
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='regional' AND active AND region=p_region
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.office_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS office_registry_select ON public.office_registry;
DROP POLICY IF EXISTS "office_registry_select" ON public.office_registry;
CREATE POLICY office_registry_select ON public.office_registry
  FOR SELECT USING (true);  -- everyone can read offices (needed for assignment lookup)

DROP POLICY IF EXISTS office_registry_admin_all ON public.office_registry;
DROP POLICY IF EXISTS "office_registry_admin_all" ON public.office_registry;
CREATE POLICY office_registry_admin_all ON public.office_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.role='admin')
  );

GRANT EXECUTE ON FUNCTION public.generate_office_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_office_for_address TO anon, authenticated;

-- ── 6. Audit notification table for unmapped streets (optional helper) ───────
-- Reuses existing notifications — no new table needed.


-- ═══ PART 4: Remaining Tables (payments, documents, locations, etc.) ═══
-- E-Mtaa schema (from cloned repo 01_final_schema.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('citizen', 'staff', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE application_status AS ENUM ('submitted','pending_review','pending_payment','paid','verified','approved','issued','returned','rejected','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE business_type AS ENUM ('seller','landlord','broker'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE business_registration_status AS ENUM ('pending','approved','rejected','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_relationship_type AS ENUM ('tenant','buyer','renter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_relationship_status AS ENUM ('active','inactive','pending','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT, sex TEXT, date_of_birth DATE, place_of_birth TEXT,
  marital_status TEXT CHECK (marital_status IN ('single','married','divorced','widowed')),
  occupation TEXT,
  education_level TEXT CHECK (education_level IN ('none','primary','secondary','diploma','degree','masters','phd')),
  nationality TEXT DEFAULT 'Tanzanian',
  country_of_citizenship TEXT DEFAULT 'Tanzania',
  nida_number TEXT UNIQUE, id_type TEXT, id_number TEXT,
  passport_number TEXT, voter_id_number TEXT, driving_license_number TEXT,
  phone TEXT, alternative_phone TEXT,
  email TEXT UNIQUE NOT NULL,
  email_address TEXT, alternative_email TEXT, photo_url TEXT,
  role user_role DEFAULT 'citizen',
  is_verified BOOLEAN DEFAULT FALSE,
  is_diaspora BOOLEAN DEFAULT FALSE,
  country_of_residence TEXT, city_of_residence TEXT,
  diaspora_region TEXT, diaspora_district TEXT, diaspora_ward TEXT,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active','suspended','pending')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  region TEXT, district TEXT, ward TEXT, street TEXT,
  house_number TEXT, postal_code TEXT, landmark TEXT,
  birth_region TEXT, birth_district TEXT,
  emergency_contact_name TEXT, emergency_contact_phone TEXT, emergency_contact_relation TEXT,
  office_id UUID, assigned_region TEXT, assigned_district TEXT,
  employee_id TEXT, department TEXT, position TEXT, employment_date DATE,
  citizen_id TEXT UNIQUE, seller_id TEXT, landlord_id TEXT, broker_id TEXT,
  blood_group TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  disability_status TEXT CHECK (disability_status IN ('none','physical','visual','hearing','speech','multiple')),
  religious_affiliation TEXT, tribe TEXT,
  mtaa_executive_officer TEXT, ward_councillor TEXT, ward_chairperson TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, name_en TEXT, description TEXT,
  form_schema JSONB NOT NULL, diaspora_form_schema JSONB, document_template JSONB,
  fee DECIMAL(12,2) DEFAULT 0, active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT CHECK (level IN ('region','district','ward','street')) NOT NULL,
  parent_id UUID REFERENCES public.locations(id),
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, code TEXT UNIQUE,
  region TEXT, district TEXT, ward TEXT, street TEXT,
  phone TEXT, email TEXT, address TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, name_sw TEXT, description TEXT, icon TEXT,
  "order" INTEGER DEFAULT 0, active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT,
  form_data JSONB NOT NULL,
  status application_status DEFAULT 'submitted',
  application_number TEXT UNIQUE,
  region TEXT, district TEXT, ward TEXT, street TEXT,
  location_id UUID REFERENCES public.locations(id),
  assigned_staff_id UUID REFERENCES public.users(id),
  assigned_office_id UUID,
  second_party_user_id UUID REFERENCES public.users(id),
  second_party_citizen_id TEXT,
  second_party_accepted BOOLEAN DEFAULT FALSE,
  second_party_accepted_at TIMESTAMPTZ,
  target_user_id UUID REFERENCES public.users(id),
  target_user_nida TEXT, target_user_role TEXT,
  agreement_status TEXT DEFAULT 'pending' CHECK (agreement_status IN ('pending','approved','rejected','expired')),
  approved_by_target UUID REFERENCES public.users(id),
  approved_by_target_at TIMESTAMPTZ,
  target_rejection_reason TEXT,
  confirmation_data JSONB,
  is_confirmed BOOLEAN DEFAULT FALSE,
  payment_data JSONB,
  approved_by UUID REFERENCES public.users(id), approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id), rejected_at TIMESTAMPTZ,
  returned_by UUID REFERENCES public.users(id), returned_at TIMESTAMPTZ,
  issued_by UUID REFERENCES public.users(id), issued_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id), verified_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL, currency TEXT DEFAULT 'TZS',
  payment_method TEXT, transaction_id TEXT UNIQUE, receipt_number TEXT UNIQUE,
  breakdown JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) NOT NULL,
  document_url TEXT NOT NULL, qr_code_url TEXT,
  certificate_id TEXT UNIQUE,
  issue_date DATE DEFAULT CURRENT_DATE, expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type business_type NOT NULL,
  business_id VARCHAR(20) UNIQUE,
  business_name VARCHAR(255), description TEXT,
  experience_years INTEGER DEFAULT 0, specialization VARCHAR(255),
  region VARCHAR(100), district VARCHAR(100), ward VARCHAR(100), street VARCHAR(255),
  phone VARCHAR(20), alt_phone VARCHAR(20), email VARCHAR(255),
  id_document_url TEXT, proof_document_url TEXT, photo_url TEXT,
  status business_registration_status DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id), reviewed_at TIMESTAMPTZ, approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_business_id VARCHAR(20), owner_business_type VARCHAR(20),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_citizen_id VARCHAR(20),
  relationship_type client_relationship_type NOT NULL,
  property_type VARCHAR(100), property_description TEXT, property_address TEXT,
  property_region VARCHAR(100), property_district VARCHAR(100), property_ward VARCHAR(100),
  agreement_id UUID, agreement_number VARCHAR(50),
  monthly_rent DECIMAL(15,2), total_price DECIMAL(15,2), deposit_amount DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'TZS',
  start_date DATE NOT NULL, end_date DATE, last_payment_date DATE, next_payment_due DATE,
  status client_relationship_status DEFAULT 'active', status_reason TEXT,
  client_name VARCHAR(255), client_phone VARCHAR(20), client_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL, old_value TEXT, new_value TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.users(id), reviewed_at TIMESTAMPTZ, rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, message TEXT, type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agreement_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_citizen_id TEXT,
  notification_type TEXT DEFAULT 'agreement_approval',
  message TEXT, is_read BOOLEAN DEFAULT FALSE, is_actioned BOOLEAN DEFAULT FALSE,
  action_taken TEXT, action_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), actioned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_category TEXT NOT NULL DEFAULT 'support',
  document_name TEXT NOT NULL, document_url TEXT NOT NULL,
  file_type TEXT, file_size INTEGER,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.users(id), verified_at TIMESTAMPTZ,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255), description TEXT,
  location_id UUID REFERENCES public.locations(id),
  start_date DATE, end_date DATE, start_time TIME, end_time TIME,
  capacity INTEGER, registered_count INTEGER DEFAULT 0, active BOOLEAN DEFAULT TRUE,
  ip_address TEXT, user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL, details JSONB, ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper functions (security definer)
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role_safe() IN ('staff','admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role_safe() = 'admin', FALSE);
$$;

-- Get user profile (used by Sidebar RPC)
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID, email TEXT, first_name TEXT, last_name TEXT,
  role TEXT, is_verified BOOLEAN, account_status TEXT,
  region TEXT, district TEXT, ward TEXT, street TEXT
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.first_name, u.last_name,
         u.role::TEXT, u.is_verified, u.account_status,
         u.region, u.district, u.ward, u.street
  FROM public.users u WHERE u.id = user_id;
$$;

CREATE SEQUENCE IF NOT EXISTS public.citizen_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_citizen_id()
RETURNS TEXT AS $$
DECLARE year_part TEXT; letter_part TEXT; number_part TEXT; new_citizen_id TEXT; counter INT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  counter := COALESCE(NEXTVAL('public.citizen_id_seq'), 1);
  letter_part := CHR(65 + ((counter - 1) / 999999) % 26);
  number_part := LPAD(((counter - 1) % 999999 + 1)::TEXT, 5, '0');
  new_citizen_id := 'CT' || year_part || letter_part || number_part;
  RETURN new_citizen_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_citizen_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.citizen_id IS NULL THEN NEW.citizen_id := public.generate_citizen_id(); END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_citizen_id ON public.users;
DROP TRIGGER IF EXISTS "trigger_set_citizen_id" ON public;
CREATE TRIGGER trigger_set_citizen_id BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_citizen_id();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS "trigger_users_updated_at" ON public;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
DROP TRIGGER IF EXISTS "trigger_applications_updated_at" ON public;
CREATE TRIGGER trigger_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS "on_auth_user_created" ON auth;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grants (PostgREST requires explicit grants in public schema)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT ON public.applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_documents TO authenticated;
GRANT SELECT ON public.generated_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT SELECT ON public.locations TO authenticated, anon;
GRANT SELECT ON public.offices TO authenticated, anon;
GRANT SELECT ON public.service_categories TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
CREATE POLICY "Staff can view all users" ON public.users FOR SELECT USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS "Staff can update users" ON public.users;
DROP POLICY IF EXISTS "Staff can update users" ON public.users;
CREATE POLICY "Staff can update users" ON public.users FOR UPDATE USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
CREATE POLICY "Admin can delete users" ON public.users FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Staff can manage services" ON public.services;
DROP POLICY IF EXISTS "Staff can manage services" ON public.services;
CREATE POLICY "Staff can manage services" ON public.services FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Citizens can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Citizens can view own applications" ON public.applications;
CREATE POLICY "Citizens can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Citizens can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Citizens can insert own applications" ON public.applications;
CREATE POLICY "Citizens can insert own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Citizens can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Citizens can update own applications" ON public.applications;
CREATE POLICY "Citizens can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Second party can view applications" ON public.applications;
DROP POLICY IF EXISTS "Second party can view applications" ON public.applications;
CREATE POLICY "Second party can view applications" ON public.applications FOR SELECT USING (second_party_user_id = auth.uid() OR target_user_id = auth.uid());
DROP POLICY IF EXISTS "Staff can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can view all applications" ON public.applications;
CREATE POLICY "Staff can view all applications" ON public.applications FOR SELECT USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS "Staff can update applications" ON public.applications;
DROP POLICY IF EXISTS "Staff can update applications" ON public.applications;
CREATE POLICY "Staff can update applications" ON public.applications FOR UPDATE USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS "Public can verify issued applications" ON public.applications;
DROP POLICY IF EXISTS "Public can verify issued applications" ON public.applications;
CREATE POLICY "Public can verify issued applications" ON public.applications FOR SELECT USING (status = 'issued');

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Staff can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view all payments" ON public.payments;
CREATE POLICY "Staff can view all payments" ON public.payments FOR SELECT USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Anyone can view generated documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Anyone can view generated documents" ON public.generated_documents;
CREATE POLICY "Anyone can view generated documents" ON public.generated_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can manage generated documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Staff can manage generated documents" ON public.generated_documents;
CREATE POLICY "Staff can manage generated documents" ON public.generated_documents FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Users can view own registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Users can view own registrations" ON public.business_registrations;
CREATE POLICY "Users can view own registrations" ON public.business_registrations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON public.business_registrations;
CREATE POLICY "Users can insert own registrations" ON public.business_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can manage registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Staff can manage registrations" ON public.business_registrations;
CREATE POLICY "Staff can manage registrations" ON public.business_registrations FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Owners can view own relationships" ON public.client_relationships;
DROP POLICY IF EXISTS "Owners can view own relationships" ON public.client_relationships;
CREATE POLICY "Owners can view own relationships" ON public.client_relationships FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Clients can view own relationships" ON public.client_relationships;
DROP POLICY IF EXISTS "Clients can view own relationships" ON public.client_relationships;
CREATE POLICY "Clients can view own relationships" ON public.client_relationships FOR SELECT USING (auth.uid() = client_id);
DROP POLICY IF EXISTS "Owners can insert relationships" ON public.client_relationships;
DROP POLICY IF EXISTS "Owners can insert relationships" ON public.client_relationships;
CREATE POLICY "Owners can insert relationships" ON public.client_relationships FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can update relationships" ON public.client_relationships;
DROP POLICY IF EXISTS "Owners can update relationships" ON public.client_relationships;
CREATE POLICY "Owners can update relationships" ON public.client_relationships FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view own change requests" ON public.profile_change_requests;
DROP POLICY IF EXISTS "Users can view own change requests" ON public.profile_change_requests;
CREATE POLICY "Users can view own change requests" ON public.profile_change_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert change requests" ON public.profile_change_requests;
DROP POLICY IF EXISTS "Users can insert change requests" ON public.profile_change_requests;
CREATE POLICY "Users can insert change requests" ON public.profile_change_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can manage profile change requests" ON public.profile_change_requests;
DROP POLICY IF EXISTS "Staff can manage profile change requests" ON public.profile_change_requests;
CREATE POLICY "Staff can manage profile change requests" ON public.profile_change_requests FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own agreement notifications" ON public.agreement_notifications;
DROP POLICY IF EXISTS "Users can view own agreement notifications" ON public.agreement_notifications;
CREATE POLICY "Users can view own agreement notifications" ON public.agreement_notifications FOR SELECT USING (recipient_id = auth.uid() OR sender_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert agreement notifications" ON public.agreement_notifications;
DROP POLICY IF EXISTS "Users can insert agreement notifications" ON public.agreement_notifications;
CREATE POLICY "Users can insert agreement notifications" ON public.agreement_notifications FOR INSERT WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "Recipients can update agreement notifications" ON public.agreement_notifications;
DROP POLICY IF EXISTS "Recipients can update agreement notifications" ON public.agreement_notifications;
CREATE POLICY "Recipients can update agreement notifications" ON public.agreement_notifications FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.user_documents;
CREATE POLICY "Users can view own documents" ON public.user_documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can upload own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can upload own documents" ON public.user_documents;
CREATE POLICY "Users can upload own documents" ON public.user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.user_documents;
CREATE POLICY "Users can update own documents" ON public.user_documents FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can view all documents" ON public.user_documents;
DROP POLICY IF EXISTS "Staff can view all documents" ON public.user_documents;
CREATE POLICY "Staff can view all documents" ON public.user_documents FOR SELECT USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_logs;
CREATE POLICY "Users can view own activity" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can view all activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Staff can view all activity" ON public.activity_logs;
CREATE POLICY "Staff can view all activity" ON public.activity_logs FOR SELECT USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_logs;
CREATE POLICY "System can insert activity" ON public.activity_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can manage locations" ON public.locations;
DROP POLICY IF EXISTS "Staff can manage locations" ON public.locations;
CREATE POLICY "Staff can manage locations" ON public.locations FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Anyone can view offices" ON public.offices;
DROP POLICY IF EXISTS "Anyone can view offices" ON public.offices;
CREATE POLICY "Anyone can view offices" ON public.offices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can manage offices" ON public.offices;
DROP POLICY IF EXISTS "Staff can manage offices" ON public.offices;
CREATE POLICY "Staff can manage offices" ON public.offices FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Anyone can view service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Anyone can view service categories" ON public.service_categories;
CREATE POLICY "Anyone can view service categories" ON public.service_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can manage service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Staff can manage service categories" ON public.service_categories;
CREATE POLICY "Staff can manage service categories" ON public.service_categories FOR ALL USING (public.is_admin_or_staff());

-- Indexes
DROP INDEX IF EXISTS "idx_users_nida";
CREATE INDEX IF NOT EXISTS idx_users_nida ON public.users(nida_number) WHERE nida_number IS NOT NULL;
DROP INDEX IF EXISTS "idx_users_phone";
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
DROP INDEX IF EXISTS "idx_users_email";
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
DROP INDEX IF EXISTS "idx_users_role";
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
DROP INDEX IF EXISTS "idx_applications_user_id";
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
DROP INDEX IF EXISTS "idx_applications_status";
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
DROP INDEX IF EXISTS "idx_applications_application_number";
CREATE INDEX IF NOT EXISTS idx_applications_application_number ON public.applications(application_number);
DROP INDEX IF EXISTS "idx_payments_application_id";
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
DROP INDEX IF EXISTS "idx_notifications_user_id";
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ═══ PART 5: Fix Profile Creation RPC ═══
-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: create_citizen_profile SECURITY DEFINER RPC
-- This bypasses RLS so it works immediately after signUp even before
-- email confirmation, when auth.uid() may be NULL for the calling session.
-- ─────────────────────────────────────────────────────────────────────────────

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
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    p_is_verified, 'citizen', 'active'
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

-- Grant execute to all roles so anon/authenticated both work at signUp time
GRANT EXECUTE ON FUNCTION public.create_citizen_profile TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Also update handle_new_user trigger to read all fields from metadata
-- so even if the RPC somehow fails, the trigger stores the full profile
-- ─────────────────────────────────────────────────────────────────────────────

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
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ═══ PART 6: Add Missing Application Columns ═══
-- Add missing columns to applications table
-- Run in Supabase SQL Editor: project xuhilnejpqvbfukyhefi

DO $$ BEGIN

  -- Officer 5-step checklist columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_phone_verified') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_phone_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_address_verified') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_address_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_id_verified') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_id_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_witnesses_added') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_witnesses_added BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_final_approved') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_final_approved BOOLEAN DEFAULT FALSE;
  END IF;

  -- Signature/stamp on users table (for officer approval)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='signature_url') THEN
    ALTER TABLE public.users ADD COLUMN signature_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stamp_url') THEN
    ALTER TABLE public.users ADD COLUMN stamp_url TEXT;
  END IF;

  -- Additional application fields used by the app
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='paid_at') THEN
    ALTER TABLE public.applications ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='buyer_accepted') THEN
    ALTER TABLE public.applications ADD COLUMN buyer_accepted BOOLEAN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='tenant_accepted') THEN
    ALTER TABLE public.applications ADD COLUMN tenant_accepted BOOLEAN;
  END IF;

END $$;

-- Fix applications RLS: allow staff/admin to update any application
DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;
DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;
CREATE POLICY "applications_staff_update"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('staff','admin')
    )
  );

-- Fix applications RLS: allow citizens to update their own (second_party acceptance etc)
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own"
  ON public.applications FOR UPDATE
  USING (user_id = auth.uid() OR second_party_user_id = auth.uid());


-- ═══ PART 7: Add Profile Complete Columns ═══
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

-- ── Fix RLS: allow citizens to update their own profile ───────────────────────
-- This is the most likely cause of the infinite spinner —
-- the UPDATE is being blocked silently by RLS.

-- Drop existing update policy if any
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
DROP POLICY IF EXISTS "users can update own row" ON public.users;

-- Create correct update policy
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also ensure SELECT works (needed by the update to verify)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Ensure INSERT works for new signups
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Staff/admin can read all users
DROP POLICY IF EXISTS "users_staff_select" ON public.users;
DROP POLICY IF EXISTS "users_staff_select" ON public.users;
CREATE POLICY "users_staff_select"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('staff', 'admin')
    )
  );

-- Staff/admin can update citizens (for verification upgrades)
DROP POLICY IF EXISTS "users_staff_update" ON public.users;
DROP POLICY IF EXISTS "users_staff_update" ON public.users;
CREATE POLICY "users_staff_update"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('staff', 'admin')
    )
  );


-- ═══ PART 8: Consolidated Fixes (account_status UPPERCASE, clean duplicate RLS) ═══
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


