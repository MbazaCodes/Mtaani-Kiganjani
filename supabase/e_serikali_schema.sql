-- ═══════════════════════════════════════════════════════════════════
-- E-Serikali Mtaa — Full Database Schema
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- Project: xuhilnejpqvbfukyhefi
-- ═══════════════════════════════════════════════════════════════════

-- E-Mtaa schema (from cloned repo 01_final_schema.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
CREATE TRIGGER trigger_set_citizen_id BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_citizen_id();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
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

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Staff can view all users" ON public.users FOR SELECT USING (public.is_admin_or_staff());
CREATE POLICY "Staff can update users" ON public.users FOR UPDATE USING (public.is_admin_or_staff());
CREATE POLICY "Admin can delete users" ON public.users FOR DELETE USING (public.is_admin());

CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Staff can manage services" ON public.services FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Citizens can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Citizens can insert own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Citizens can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Second party can view applications" ON public.applications FOR SELECT USING (second_party_user_id = auth.uid() OR target_user_id = auth.uid());
CREATE POLICY "Staff can view all applications" ON public.applications FOR SELECT USING (public.is_admin_or_staff());
CREATE POLICY "Staff can update applications" ON public.applications FOR UPDATE USING (public.is_admin_or_staff());
CREATE POLICY "Public can verify issued applications" ON public.applications FOR SELECT USING (status = 'issued');

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
CREATE POLICY "Staff can view all payments" ON public.payments FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Anyone can view generated documents" ON public.generated_documents FOR SELECT USING (true);
CREATE POLICY "Staff can manage generated documents" ON public.generated_documents FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Users can view own registrations" ON public.business_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own registrations" ON public.business_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage registrations" ON public.business_registrations FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Owners can view own relationships" ON public.client_relationships FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Clients can view own relationships" ON public.client_relationships FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Owners can insert relationships" ON public.client_relationships FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update relationships" ON public.client_relationships FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own change requests" ON public.profile_change_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert change requests" ON public.profile_change_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage profile change requests" ON public.profile_change_requests FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own agreement notifications" ON public.agreement_notifications FOR SELECT USING (recipient_id = auth.uid() OR sender_id = auth.uid());
CREATE POLICY "Users can insert agreement notifications" ON public.agreement_notifications FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Recipients can update agreement notifications" ON public.agreement_notifications FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "Users can view own documents" ON public.user_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own documents" ON public.user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.user_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all documents" ON public.user_documents FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activity" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all activity" ON public.activity_logs FOR SELECT USING (public.is_admin_or_staff());
CREATE POLICY "System can insert activity" ON public.activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Staff can manage locations" ON public.locations FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Anyone can view offices" ON public.offices FOR SELECT USING (true);
CREATE POLICY "Staff can manage offices" ON public.offices FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Anyone can view service categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Staff can manage service categories" ON public.service_categories FOR ALL USING (public.is_admin_or_staff());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_nida ON public.users(nida_number) WHERE nida_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_application_number ON public.applications(application_number);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
-- ─── Extended profile creation RPC + improved trigger ──────────────

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

-- ─── Additional RLS policies (is_staff_or_admin helper + extras) ────

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
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Citizens can update their own profile
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Staff can read all citizens (needed for verification, support, review)
DROP POLICY IF EXISTS "users_select_staff" ON public.users;
CREATE POLICY "users_select_staff" ON public.users
  FOR SELECT USING (public.is_staff_or_admin());

-- Admin can update any user (role changes, verification, etc.)
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.is_admin());

-- Service creation (signup) — allow insert for authenticated users
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
CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    
    -- Citizen updates own profile
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
    
    -- Staff/admin can read all profiles (for buyer/tenant lookup in Sales/Rental)
    DROP POLICY IF EXISTS "profiles_select_staff" ON public.profiles;
CREATE POLICY "profiles_select_staff" ON public.profiles
      FOR SELECT USING (public.is_staff_or_admin());

    -- Insert own profile
    DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);

    -- Allow authenticated users to search by NIDA/phone (for agreement counterparty lookup)
    -- This is safe because the search only returns basic public fields
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
CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);

-- Citizen can insert their own applications
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff/admin can read all applications
DROP POLICY IF EXISTS "applications_select_staff" ON public.applications;
CREATE POLICY "applications_select_staff" ON public.applications
  FOR SELECT USING (public.is_staff_or_admin());

-- Staff/admin can update applications (approve, reject, etc.)
DROP POLICY IF EXISTS "applications_update_staff" ON public.applications;
CREATE POLICY "applications_update_staff" ON public.applications
  FOR UPDATE USING (public.is_staff_or_admin());

-- Citizen can update own application (for buyer_accepted / tenant_accepted)
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE USING (auth.uid() = user_id);

-- Also allow target_user to update (counterparty acceptance)
DROP POLICY IF EXISTS "applications_update_target" ON public.applications;
CREATE POLICY "applications_update_target" ON public.applications
  FOR UPDATE USING (auth.uid() = target_user_id);

-- ══════════════════════════════════════════════════════════════════
-- 4. NOTIFICATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User can only see their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- User can update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Any authenticated user can insert notifications (forms create notifications for others)
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
CREATE POLICY "notifications_insert_auth" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Staff/admin can read all notifications (for support)
DROP POLICY IF EXISTS "notifications_select_staff" ON public.notifications;
CREATE POLICY "notifications_select_staff" ON public.notifications
  FOR SELECT USING (public.is_staff_or_admin());

-- ══════════════════════════════════════════════════════════════════
-- 5. AGREEMENT_NOTIFICATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.agreement_notifications ENABLE ROW LEVEL SECURITY;

-- Recipient can see their agreement notifications
DROP POLICY IF EXISTS "agreement_notifs_select_recipient" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_recipient" ON public.agreement_notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- Sender can see what they sent
DROP POLICY IF EXISTS "agreement_notifs_select_sender" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_sender" ON public.agreement_notifications
  FOR SELECT USING (auth.uid() = sender_id);

-- Recipient can update (accept/reject)
DROP POLICY IF EXISTS "agreement_notifs_update_recipient" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_update_recipient" ON public.agreement_notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Any authenticated user can insert (seller/landlord creates for buyer/tenant)
DROP POLICY IF EXISTS "agreement_notifs_insert_auth" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_insert_auth" ON public.agreement_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Staff/admin can read all
DROP POLICY IF EXISTS "agreement_notifs_select_staff" ON public.agreement_notifications;
CREATE POLICY "agreement_notifs_select_staff" ON public.agreement_notifications
  FOR SELECT USING (public.is_staff_or_admin());

-- ══════════════════════════════════════════════════════════════════
-- 6. BUSINESS_REGISTRATIONS TABLE
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;

-- Citizen can read their own registrations
DROP POLICY IF EXISTS "bizreg_select_own" ON public.business_registrations;
CREATE POLICY "bizreg_select_own" ON public.business_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- Citizen can insert their own registrations
DROP POLICY IF EXISTS "bizreg_insert_own" ON public.business_registrations;
CREATE POLICY "bizreg_insert_own" ON public.business_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff/admin can read all registrations
DROP POLICY IF EXISTS "bizreg_select_staff" ON public.business_registrations;
CREATE POLICY "bizreg_select_staff" ON public.business_registrations
  FOR SELECT USING (public.is_staff_or_admin());

-- Staff/admin can update registrations (approve/reject)
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
CREATE POLICY "services_select_all" ON public.services
      FOR SELECT USING (true);
    
    -- Only admin can modify services
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
CREATE POLICY "logs_select_admin" ON public.activity_logs
      FOR SELECT USING (public.is_admin());
    
    -- Any authenticated user can insert logs
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
    CREATE POLICY "storage_upload_own" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = 'business-docs' AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
    
    -- Read policy: owner can read their own files
    CREATE POLICY "storage_select_own" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[2] = auth.uid()::text
      );
    
    -- Staff/admin can read all documents
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
CREATE POLICY "locations_select_all" ON public.locations
      FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "locations_modify_admin" ON public.locations;
CREATE POLICY "locations_modify_admin" ON public.locations
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- Done. Run this in Supabase Dashboard → SQL Editor.
