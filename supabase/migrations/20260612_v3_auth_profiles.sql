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

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Staff/admin: can read all citizens
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

CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT USING (user_id = auth.uid() OR second_party_user_id = auth.uid());

CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "applications_staff_select" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('staff','admin'))
  );

CREATE POLICY "applications_staff_update" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('staff','admin'))
  );

-- ── 12. INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_phone   ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email   ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nida    ON public.users(nida_number);
CREATE INDEX IF NOT EXISTS idx_users_role    ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_region  ON public.users(region);
CREATE INDEX IF NOT EXISTS idx_users_verification ON public.users(verification_level);
CREATE INDEX IF NOT EXISTS idx_applications_user    ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status  ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_service ON public.applications(service_name);
CREATE INDEX IF NOT EXISTS idx_applications_region  ON public.applications(region);
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

CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_select_all" ON public.services;
CREATE POLICY "services_select_all" ON public.services FOR SELECT USING (true);
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
