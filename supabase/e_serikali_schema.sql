-- ============================================================================
-- E-SERIKALI MTAA — PRODUCTION DATABASE SCHEMA
-- Merged: original production schema + E-Mtaa fixes
-- Run ONCE in Supabase Dashboard → SQL Editor
-- Project: xuhilnejpqvbfukyhefi
-- ============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('citizen', 'staff', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE application_status AS ENUM ('submitted','pending_review','pending_payment','paid','verified','approved','issued','returned','rejected','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE business_type AS ENUM ('seller','landlord','broker'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE business_registration_status AS ENUM ('pending','approved','rejected','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_relationship_type AS ENUM ('tenant','buyer','renter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_relationship_status AS ENUM ('active','inactive','pending','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firebase_uid TEXT UNIQUE,
  citizen_id TEXT UNIQUE,

  -- Personal
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  alternative_phone TEXT,
  photo_url TEXT,

  -- Demographic
  sex TEXT,
  gender TEXT,
  date_of_birth DATE,
  place_of_birth TEXT,
  marital_status TEXT CHECK (marital_status IN ('single','married','divorced','widowed')),
  occupation TEXT,
  education_level TEXT CHECK (education_level IN ('none','primary','secondary','diploma','degree','masters','phd')),
  nationality TEXT DEFAULT 'Tanzanian',
  country_of_citizenship TEXT DEFAULT 'Tanzania',
  blood_group TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  disability_status TEXT CHECK (disability_status IN ('none','physical','visual','hearing','speech','multiple')),
  religious_affiliation TEXT,
  tribe TEXT,

  -- IDs
  nida_number TEXT UNIQUE,
  id_type TEXT,
  id_number TEXT,
  passport_number TEXT,
  voter_id_number TEXT,
  driving_license_number TEXT,

  -- Location
  region TEXT, district TEXT, ward TEXT, street TEXT,
  house_number TEXT, postal_code TEXT, landmark TEXT,
  birth_region TEXT, birth_district TEXT,

  -- Diaspora
  is_diaspora BOOLEAN DEFAULT FALSE,
  country_of_residence TEXT, city_of_residence TEXT,
  diaspora_region TEXT, diaspora_district TEXT, diaspora_ward TEXT,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active','suspended','pending')),

  -- Role
  role user_role DEFAULT 'citizen',

  -- Business
  seller_id TEXT, landlord_id TEXT, broker_id TEXT,

  -- Staff
  office_id UUID,
  assigned_region TEXT, assigned_district TEXT,
  employee_id TEXT, department TEXT, position TEXT, employment_date DATE,

  -- Local leaders
  mtaa_executive_officer TEXT, ward_councillor TEXT, ward_chairperson TEXT,

  -- Emergency
  emergency_contact_name TEXT, emergency_contact_phone TEXT, emergency_contact_relation TEXT,

  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT CHECK (level IN ('region','district','ward','street')) NOT NULL,
  parent_id UUID REFERENCES public.locations(id),
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, code TEXT UNIQUE,
  region TEXT, district TEXT, ward TEXT, street TEXT,
  phone TEXT, email TEXT, address TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, name_en TEXT, description TEXT,
  form_schema JSONB NOT NULL, diaspora_form_schema JSONB, document_template JSONB,
  fee DECIMAL(12,2) DEFAULT 0, active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, name_sw TEXT, description TEXT, icon TEXT,
  "order" INTEGER DEFAULT 0, active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_number TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT,
  form_data JSONB NOT NULL,
  status application_status DEFAULT 'submitted',
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

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_nida ON public.users(nida_number) WHERE nida_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid) WHERE firebase_uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_citizen_id ON public.users(citizen_id) WHERE citizen_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_number ON public.applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_staff ON public.applications(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_business_registrations_user_id ON public.business_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_status ON public.business_registrations(status);
CREATE INDEX IF NOT EXISTS idx_client_relationships_owner_id ON public.client_relationships(owner_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_client_id ON public.client_relationships(client_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

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

CREATE OR REPLACE FUNCTION public.set_citizen_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.citizen_id IS NULL THEN NEW.citizen_id := public.generate_citizen_id(); END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Role check functions
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$;

-- Alias used by older code
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role() = 'admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role() IN ('staff','admin'), FALSE);
$$;

-- Alias used by older code
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role() IN ('staff','admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role() = required_role, FALSE);
$$;

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

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_set_citizen_id ON public.users;
CREATE TRIGGER trigger_set_citizen_id BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_citizen_id();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
CREATE TRIGGER trigger_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- AUTO-PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE meta JSONB := NEW.raw_user_meta_data;
BEGIN
  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name,
    phone, sex, gender, date_of_birth, place_of_birth,
    marital_status, occupation, education_level,
    nationality, country_of_citizenship,
    nida_number, id_type, id_number,
    region, district, ward, street,
    is_diaspora, country_of_residence, passport_number,
    firebase_uid, is_verified, role, account_status
  ) VALUES (
    NEW.id, NEW.email,
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
    meta->>'region', meta->>'district', meta->>'ward', meta->>'street',
    COALESCE((meta->>'is_diaspora')::BOOLEAN, FALSE),
    meta->>'country_of_residence',
    meta->>'passport_number',
    meta->>'firebase_uid',
    COALESCE((meta->>'is_verified')::BOOLEAN, FALSE),
    COALESCE((meta->>'role')::user_role, 'citizen'),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- CITIZEN PROFILE RPC
-- NOTE: is_verified defaults FALSE for staff (forced password change on first login)
--       Citizens are verified immediately on signup.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_citizen_profile(
  p_id UUID,
  p_first_name TEXT,
  p_middle_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT '',
  p_email TEXT DEFAULT '',
  p_phone TEXT DEFAULT NULL,
  p_sex TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_place_of_birth TEXT DEFAULT NULL,
  p_marital_status TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_education_level TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT 'Tanzanian',
  p_country_of_citizenship TEXT DEFAULT 'Tanzania',
  p_nida_number TEXT DEFAULT NULL,
  p_id_type TEXT DEFAULT NULL,
  p_id_number TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_ward TEXT DEFAULT NULL,
  p_street TEXT DEFAULT NULL,
  p_is_diaspora BOOLEAN DEFAULT FALSE,
  p_country_of_residence TEXT DEFAULT NULL,
  p_passport_number TEXT DEFAULT NULL,
  p_firebase_uid TEXT DEFAULT NULL,
  p_is_verified BOOLEAN DEFAULT TRUE
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
    firebase_uid, is_verified, role, account_status
  ) VALUES (
    p_id, p_first_name, p_middle_name, p_last_name,
    p_email, p_phone, p_sex, p_gender,
    p_date_of_birth, p_place_of_birth,
    p_marital_status, p_occupation, p_education_level,
    p_nationality, p_country_of_citizenship,
    p_nida_number, p_id_type, p_id_number,
    p_region, p_district, p_ward, p_street,
    p_is_diaspora, p_country_of_residence, p_passport_number,
    p_firebase_uid, p_is_verified, 'citizen', 'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name            = EXCLUDED.first_name,
    middle_name           = COALESCE(EXCLUDED.middle_name, public.users.middle_name),
    last_name             = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE public.users.last_name END,
    phone                 = COALESCE(EXCLUDED.phone, public.users.phone),
    firebase_uid          = COALESCE(EXCLUDED.firebase_uid, public.users.firebase_uid),
    is_verified           = EXCLUDED.is_verified,
    updated_at            = NOW()
  WHERE public.users.id = p_id;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_citizen_profile TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role_safe TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO anon, authenticated, service_role;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- USERS
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_select_staff" ON public.users;
CREATE POLICY "users_select_staff" ON public.users FOR SELECT USING (public.is_staff_or_admin());
DROP POLICY IF EXISTS "users_update_staff" ON public.users;
CREATE POLICY "users_update_staff" ON public.users FOR UPDATE USING (public.is_staff_or_admin());
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE USING (public.is_admin());

-- APPLICATIONS
DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
CREATE POLICY "applications_select_own" ON public.applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "applications_update_target" ON public.applications;
CREATE POLICY "applications_update_target" ON public.applications FOR UPDATE USING (auth.uid() = target_user_id);
DROP POLICY IF EXISTS "applications_select_second_party" ON public.applications;
CREATE POLICY "applications_select_second_party" ON public.applications FOR SELECT USING (auth.uid() = second_party_user_id OR auth.uid() = target_user_id);
DROP POLICY IF EXISTS "applications_select_staff" ON public.applications;
CREATE POLICY "applications_select_staff" ON public.applications FOR SELECT USING (public.is_staff_or_admin());
DROP POLICY IF EXISTS "applications_update_staff" ON public.applications;
CREATE POLICY "applications_update_staff" ON public.applications FOR UPDATE USING (public.is_staff_or_admin());
DROP POLICY IF EXISTS "applications_select_public" ON public.applications;
CREATE POLICY "applications_select_public" ON public.applications FOR SELECT USING (status = 'issued');

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "notifications_select_staff" ON public.notifications;
CREATE POLICY "notifications_select_staff" ON public.notifications FOR SELECT USING (public.is_staff_or_admin());

-- AGREEMENT NOTIFICATIONS
DROP POLICY IF EXISTS "agreement_notifs_select_recipient" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_recipient" ON public.agreement_notifications FOR SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "agreement_notifs_select_sender" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_sender" ON public.agreement_notifications FOR SELECT USING (auth.uid() = sender_id);
DROP POLICY IF EXISTS "agreement_notifs_update_recipient" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_update_recipient" ON public.agreement_notifications FOR UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "agreement_notifs_insert_auth" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_insert_auth" ON public.agreement_notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "agreement_notifs_select_staff" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_staff" ON public.agreement_notifications FOR SELECT USING (public.is_staff_or_admin());

-- BUSINESS REGISTRATIONS
DROP POLICY IF EXISTS "bizreg_select_own" ON public.business_registrations;
CREATE POLICY "bizreg_select_own" ON public.business_registrations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "bizreg_insert_own" ON public.business_registrations;
CREATE POLICY "bizreg_insert_own" ON public.business_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bizreg_update_own" ON public.business_registrations;
CREATE POLICY "bizreg_update_own" ON public.business_registrations FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "bizreg_select_staff" ON public.business_registrations;
CREATE POLICY "bizreg_select_staff" ON public.business_registrations FOR SELECT USING (public.is_staff_or_admin());
DROP POLICY IF EXISTS "bizreg_update_staff" ON public.business_registrations;
CREATE POLICY "bizreg_update_staff" ON public.business_registrations FOR UPDATE USING (public.is_staff_or_admin());

-- CLIENT RELATIONSHIPS
DROP POLICY IF EXISTS "relationships_select_owner" ON public.client_relationships;
CREATE POLICY "relationships_select_owner" ON public.client_relationships FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "relationships_select_client" ON public.client_relationships;
CREATE POLICY "relationships_select_client" ON public.client_relationships FOR SELECT USING (auth.uid() = client_id);
DROP POLICY IF EXISTS "relationships_insert_owner" ON public.client_relationships;
CREATE POLICY "relationships_insert_owner" ON public.client_relationships FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "relationships_update_owner" ON public.client_relationships;
CREATE POLICY "relationships_update_owner" ON public.client_relationships FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "relationships_select_staff" ON public.client_relationships;
CREATE POLICY "relationships_select_staff" ON public.client_relationships FOR SELECT USING (public.is_staff_or_admin());

-- SERVICES
DROP POLICY IF EXISTS "services_select_all" ON public.services;
CREATE POLICY "services_select_all" ON public.services FOR SELECT USING (active = true OR public.is_staff_or_admin());
DROP POLICY IF EXISTS "services_modify_staff" ON public.services;
CREATE POLICY "services_modify_staff" ON public.services FOR ALL USING (public.is_staff_or_admin());

-- LOCATIONS
DROP POLICY IF EXISTS "locations_select_all" ON public.locations;
CREATE POLICY "locations_select_all" ON public.locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "locations_modify_staff" ON public.locations;
CREATE POLICY "locations_modify_staff" ON public.locations FOR ALL USING (public.is_staff_or_admin());

-- OFFICES
DROP POLICY IF EXISTS "offices_select_all" ON public.offices;
CREATE POLICY "offices_select_all" ON public.offices FOR SELECT USING (true);
DROP POLICY IF EXISTS "offices_modify_staff" ON public.offices;
CREATE POLICY "offices_modify_staff" ON public.offices FOR ALL USING (public.is_staff_or_admin());

-- SERVICE CATEGORIES
DROP POLICY IF EXISTS "service_categories_select_all" ON public.service_categories;
CREATE POLICY "service_categories_select_all" ON public.service_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_categories_modify_staff" ON public.service_categories;
CREATE POLICY "service_categories_modify_staff" ON public.service_categories FOR ALL USING (public.is_staff_or_admin());

-- USER DOCUMENTS
DROP POLICY IF EXISTS "documents_select_own" ON public.user_documents;
CREATE POLICY "documents_select_own" ON public.user_documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "documents_insert_own" ON public.user_documents;
CREATE POLICY "documents_insert_own" ON public.user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "documents_update_own" ON public.user_documents;
CREATE POLICY "documents_update_own" ON public.user_documents FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "documents_select_staff" ON public.user_documents;
CREATE POLICY "documents_select_staff" ON public.user_documents FOR SELECT USING (public.is_staff_or_admin());

-- PAYMENTS
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "payments_select_staff" ON public.payments;
CREATE POLICY "payments_select_staff" ON public.payments FOR SELECT USING (public.is_staff_or_admin());

-- GENERATED DOCUMENTS
DROP POLICY IF EXISTS "generated_documents_select_all" ON public.generated_documents;
CREATE POLICY "generated_documents_select_all" ON public.generated_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "generated_documents_modify_staff" ON public.generated_documents;
CREATE POLICY "generated_documents_modify_staff" ON public.generated_documents FOR ALL USING (public.is_staff_or_admin());

-- PROFILE CHANGE REQUESTS
DROP POLICY IF EXISTS "pcr_select_own" ON public.profile_change_requests;
CREATE POLICY "pcr_select_own" ON public.profile_change_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pcr_insert_own" ON public.profile_change_requests;
CREATE POLICY "pcr_insert_own" ON public.profile_change_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "pcr_select_staff" ON public.profile_change_requests;
CREATE POLICY "pcr_select_staff" ON public.profile_change_requests FOR ALL USING (public.is_staff_or_admin());

-- SESSIONS
DROP POLICY IF EXISTS "sessions_select_own" ON public.sessions;
CREATE POLICY "sessions_select_own" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sessions_insert_own" ON public.sessions;
CREATE POLICY "sessions_insert_own" ON public.sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ACTIVITY LOGS
DROP POLICY IF EXISTS "logs_select_admin" ON public.activity_logs;
CREATE POLICY "logs_select_admin" ON public.activity_logs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "logs_insert_auth" ON public.activity_logs;
CREATE POLICY "logs_insert_auth" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "logs_select_own" ON public.activity_logs;
CREATE POLICY "logs_select_own" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- DONE
-- ============================================================================
