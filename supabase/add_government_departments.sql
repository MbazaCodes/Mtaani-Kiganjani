-- ============================================================================
-- Government Department Integration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Government departments (Police, Health, Judiciary, etc.)
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

-- 2. Department users (staff assigned to departments)
CREATE TABLE IF NOT EXISTS public.department_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.government_departments(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('head', 'officer', 'clerk')) DEFAULT 'officer',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

-- 3. Escalations from ward staff to departments
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

-- 4. Auto-forwarded application copies to departments
CREATE TABLE IF NOT EXISTS public.department_application_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.government_departments(id) ON DELETE CASCADE,
  auto_forwarded BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.government_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_application_copies ENABLE ROW LEVEL SECURITY;

-- Policies: admin full access, staff read, department users access their own
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalations_department ON public.escalations(to_department_id);
CREATE INDEX IF NOT EXISTS idx_escalations_application ON public.escalations(application_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);
CREATE INDEX IF NOT EXISTS idx_dept_users_department ON public.department_users(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_users_user ON public.department_users(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_copies_department ON public.department_application_copies(department_id);
