-- ============================================================================
-- Government Department Integration (safe to re-run)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Tables (IF NOT EXISTS — safe to re-run)
CREATE TABLE IF NOT EXISTS public.government_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_sw TEXT,
  code TEXT UNIQUE NOT NULL,
  level TEXT CHECK (level IN ('national', 'regional', 'district')) DEFAULT 'district',
  parent_department_id UUID REFERENCES public.government_departments(id),
  region TEXT,
  district TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.government_departments(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('head', 'officer', 'clerk')) DEFAULT 'officer',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.users(id),
  to_department_id UUID REFERENCES public.government_departments(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'responded', 'referred', 'resolved', 'rejected'))
    DEFAULT 'pending',
  escalation_note TEXT,
  response_note TEXT,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_application_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.government_departments(id) ON DELETE CASCADE,
  auto_forwarded BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS (safe to re-enable)
ALTER TABLE public.government_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_application_copies ENABLE ROW LEVEL SECURITY;

-- 3. Policies — DROP IF EXISTS then recreate (safe to re-run)
DROP POLICY IF EXISTS "Admin full access to departments" ON public.government_departments;
DROP POLICY IF EXISTS "Authenticated users read departments" ON public.government_departments;
DROP POLICY IF EXISTS "Admin full access to department_users" ON public.department_users;
DROP POLICY IF EXISTS "Department users read own assignments" ON public.department_users;
DROP POLICY IF EXISTS "Staff and admin manage escalations" ON public.escalations;
DROP POLICY IF EXISTS "Department users read escalations" ON public.escalations;
DROP POLICY IF EXISTS "Staff and admin manage copies" ON public.department_application_copies;

CREATE POLICY "Admin full access to departments" ON public.government_departments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users read departments" ON public.government_departments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin full access to department_users" ON public.department_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Department users read own assignments" ON public.department_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff and admin manage escalations" ON public.escalations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

CREATE POLICY "Department users read escalations" ON public.escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.department_users
      WHERE user_id = auth.uid() AND department_id = escalations.to_department_id
    )
  );

CREATE POLICY "Staff and admin manage copies" ON public.department_application_copies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- 4. Indexes (IF NOT EXISTS — safe)
CREATE INDEX IF NOT EXISTS idx_escalations_department ON public.escalations(to_department_id);
CREATE INDEX IF NOT EXISTS idx_escalations_application ON public.escalations(application_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);
CREATE INDEX IF NOT EXISTS idx_dept_users_department ON public.department_users(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_users_user ON public.department_users(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_copies_department ON public.department_application_copies(department_id);

-- ============================================================================
-- 5. Pre-populate ALL main Tanzania government departments
--    Uses ON CONFLICT (code) DO NOTHING so it's safe to re-run
-- ============================================================================

INSERT INTO public.government_departments (name, name_sw, code, level, description, active) VALUES
  -- Security & Law Enforcement
  ('Tanzania Police Force', 'Jeshi la Polisi Tanzania', 'TPF', 'national', 'National police force responsible for maintaining law and order', true),
  ('Tanzania Peoples Defence Force', 'Jeshi la Ulinzi la Wananchi wa Tanzania', 'TPDF', 'national', 'National military and defence force', true),
  ('Tanzania Intelligence and Security Service', 'Huduma ya Usalama wa Taifa', 'TISS', 'national', 'National intelligence and security', true),
  ('Tanzania Prisons Service', 'Jeshi la Magereza Tanzania', 'TPS', 'national', 'National prisons and correctional services', true),
  ('Immigration Department', 'Idara ya Uhamiaji', 'IMM', 'national', 'Passport, visa, and immigration services', true),
  ('Fire and Rescue Force', 'Jeshi la Zimamoto na Uokoaji', 'FRF', 'national', 'Fire prevention and emergency rescue services', true),
  ('National Prosecution Service', 'Ofisi ya Mkurugenzi wa Mashtaka', 'NPS', 'national', 'Criminal prosecution authority', true),

  -- Judiciary & Legal
  ('Judiciary of Tanzania', 'Mahakama ya Tanzania', 'JUD', 'national', 'Courts and judicial administration', true),
  ('Court of Appeal', 'Mahakama ya Rufani', 'COA', 'national', 'Highest court of appeal', true),
  ('High Court of Tanzania', 'Mahakama Kuu ya Tanzania', 'HCT', 'national', 'High court with original and appellate jurisdiction', true),
  ('Attorney General Office', 'Ofisi ya Mwanasheria Mkuu', 'AGO', 'national', 'Chief legal adviser to the government', true),
  ('Commission for Human Rights and Good Governance', 'Tume ya Haki za Binadamu na Utawala Bora', 'CHRGG', 'national', 'Human rights and governance oversight', true),

  -- Finance & Revenue
  ('Tanzania Revenue Authority', 'Mamlaka ya Mapato Tanzania', 'TRA', 'national', 'Tax collection and revenue administration', true),
  ('Bank of Tanzania', 'Benki Kuu ya Tanzania', 'BOT', 'national', 'Central bank — monetary policy and financial regulation', true),
  ('Ministry of Finance', 'Wizara ya Fedha', 'MOF', 'national', 'National budget, fiscal policy, and public finance', true),
  ('National Audit Office', 'Ofisi ya Taifa ya Ukaguzi', 'NAO', 'national', 'Government financial auditing', true),

  -- Health
  ('Ministry of Health', 'Wizara ya Afya', 'MOH', 'national', 'Public health policy, hospitals, and disease control', true),
  ('Tanzania Food and Drugs Authority', 'Mamlaka ya Chakula na Dawa', 'TFDA', 'national', 'Food and drug safety regulation', true),
  ('National Health Insurance Fund', 'Mfuko wa Taifa wa Bima ya Afya', 'NHIF', 'national', 'National health insurance coverage', true),

  -- Education
  ('Ministry of Education', 'Wizara ya Elimu, Sayansi na Teknolojia', 'MOE', 'national', 'Education policy, schools, and universities', true),
  ('National Examinations Council', 'Baraza la Mitihani la Taifa (NECTA)', 'NECTA', 'national', 'National examinations administration', true),
  ('Tanzania Commission for Universities', 'Tume ya Vyuo Vikuu Tanzania', 'TCU', 'national', 'University accreditation and regulation', true),
  ('Higher Education Students Loans Board', 'Bodi ya Mikopo ya Wanafunzi wa Elimu ya Juu', 'HESLB', 'national', 'Student loan administration', true),

  -- Land, Housing & Environment
  ('Ministry of Lands', 'Wizara ya Ardhi, Nyumba na Maendeleo ya Makazi', 'MOL', 'national', 'Land administration, title deeds, and housing', true),
  ('National Environment Management Council', 'Baraza la Taifa la Usimamizi wa Mazingira', 'NEMC', 'national', 'Environmental protection and impact assessment', true),

  -- Transport & Infrastructure
  ('Tanzania National Roads Agency', 'Wakala wa Barabara Tanzania (TANROADS)', 'TNR', 'national', 'National road construction and maintenance', true),
  ('Land Transport Regulatory Authority', 'Mamlaka ya Udhibiti wa Usafiri wa Nchi Kavu (LATRA)', 'LATRA', 'national', 'Road transport licensing and regulation', true),
  ('Tanzania Airports Authority', 'Mamlaka ya Viwanja vya Ndege Tanzania', 'TAA', 'national', 'Airport management and aviation', true),
  ('Tanzania Ports Authority', 'Mamlaka ya Bandari Tanzania', 'TPA', 'national', 'Port management and maritime services', true),

  -- Business & Industry
  ('Business Registrations and Licensing Agency', 'Wakala wa Usajili wa Biashara na Leseni (BRELA)', 'BRELA', 'national', 'Company registration and business licensing', true),
  ('Tanzania Investment Centre', 'Kituo cha Uwekezaji Tanzania', 'TIC', 'national', 'Investment promotion and facilitation', true),
  ('Fair Competition Commission', 'Tume ya Ushindani', 'FCC', 'national', 'Market competition and consumer protection', true),
  ('Small Industries Development Organisation', 'Shirika la Viwanda Vidogo (SIDO)', 'SIDO', 'national', 'Small business and industrial development', true),

  -- Social Services & Labour
  ('Social Welfare Department', 'Idara ya Ustawi wa Jamii', 'SWD', 'national', 'Child welfare, elderly care, and social protection', true),
  ('Ministry of Labour', 'Wizara ya Kazi, Vijana na Ajira', 'MOLAB', 'national', 'Labour rights, employment, and youth affairs', true),
  ('National Social Security Fund', 'Mfuko wa Taifa wa Hifadhi ya Jamii (NSSF)', 'NSSF', 'national', 'Social security and pension administration', true),
  ('Workers Compensation Fund', 'Mfuko wa Fidia kwa Wafanyakazi', 'WCF', 'national', 'Workplace injury compensation', true),

  -- Registration & Identity
  ('Registration Insolvency and Trusteeship Agency', 'Wakala wa Usajili wa Vizazi na Vifo (RITA)', 'RITA', 'national', 'Birth and death registration, marriage certificates', true),
  ('National Identification Authority', 'Mamlaka ya Vitambulisho vya Taifa (NIDA)', 'NIDA', 'national', 'National ID cards and citizen identification', true),
  ('Tanzania Communications Regulatory Authority', 'Mamlaka ya Mawasiliano Tanzania (TCRA)', 'TCRA', 'national', 'Telecommunications and broadcasting regulation', true),

  -- Agriculture & Natural Resources
  ('Ministry of Agriculture', 'Wizara ya Kilimo', 'MOA', 'national', 'Agricultural policy, crop development, and food security', true),
  ('Ministry of Livestock and Fisheries', 'Wizara ya Mifugo na Uvuvi', 'MLF', 'national', 'Livestock, dairy, and fisheries management', true),
  ('Ministry of Water', 'Wizara ya Maji', 'MOW', 'national', 'Water supply and sanitation services', true),
  ('Ministry of Energy', 'Wizara ya Nishati', 'MOEN', 'national', 'Energy policy, TANESCO oversight, and natural gas', true),
  ('Tanzania Forest Service Agency', 'Wakala wa Huduma za Misitu (TFS)', 'TFS', 'national', 'Forest conservation and management', true),
  ('Mining Commission', 'Tume ya Madini', 'MC', 'national', 'Mining licensing and mineral regulation', true),

  -- Utilities & Public Services
  ('TANESCO', 'Shirika la Umeme Tanzania (TANESCO)', 'TANESCO', 'national', 'National electricity generation and distribution', true),
  ('DAWASA / DAWASCO', 'Mamlaka ya Majisafi na Usafi wa Mazingira Dar es Salaam', 'DAWASA', 'national', 'Dar es Salaam water supply and sewerage', true),
  ('Drug Control Commission', 'Tume ya Kudhibiti Dawa za Kulevya', 'DCC', 'national', 'Anti-narcotics and drug control', true),
  ('Prevention and Combating of Corruption Bureau', 'Taasisi ya Kuzuia na Kupambana na Rushwa (TAKUKURU)', 'TAKUKURU', 'national', 'Anti-corruption investigation and prosecution', true),

  -- Local Government
  ('TAMISEMI (Local Government)', 'Ofisi ya Rais — TAMISEMI', 'TAMISEMI', 'national', 'President''s Office — Regional Administration and Local Government', true),
  ('Ethics Secretariat', 'Sekretarieti ya Maadili ya Viongozi wa Umma', 'ETHICS', 'national', 'Public leaders ethics and accountability', true)

ON CONFLICT (code) DO NOTHING;
