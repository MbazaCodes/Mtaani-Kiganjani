-- ============================================================
-- MODULE 3: Community Reporting
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- 1. Community Reports
CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT UNIQUE NOT NULL,
  citizen_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority ticket_priority DEFAULT 'normal',
  status ticket_status DEFAULT 'submitted',
  -- Location
  region TEXT,
  district TEXT,
  ward TEXT,
  street TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  -- Assignment
  assigned_to UUID REFERENCES public.users(id),
  assigned_department_id UUID REFERENCES public.government_departments(id),
  -- Resolution
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Report Media (photos)
CREATE TABLE IF NOT EXISTS public.community_report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.community_reports(id) ON DELETE CASCADE,
  media_data TEXT, -- base64
  media_type TEXT DEFAULT 'image',
  file_name TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Report Responses (thread — reuse same pattern as tickets)
CREATE TABLE IF NOT EXISTS public.report_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.community_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_citizen ON public.community_reports(citizen_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.community_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_ward ON public.community_reports(ward);
CREATE INDEX IF NOT EXISTS idx_reports_district ON public.community_reports(district);
CREATE INDEX IF NOT EXISTS idx_reports_department ON public.community_reports(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_report_media_report ON public.community_report_media(report_id);
CREATE INDEX IF NOT EXISTS idx_report_responses_report ON public.report_responses(report_id);

-- RLS
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_responses ENABLE ROW LEVEL SECURITY;

-- Policies: community_reports
DROP POLICY IF EXISTS "Citizens read own reports" ON public.community_reports;
CREATE POLICY "Citizens read own reports" ON public.community_reports
  FOR SELECT USING (citizen_id = auth.uid());

DROP POLICY IF EXISTS "Citizens create reports" ON public.community_reports;
CREATE POLICY "Citizens create reports" ON public.community_reports
  FOR INSERT WITH CHECK (citizen_id = auth.uid());

DROP POLICY IF EXISTS "Staff manage reports" ON public.community_reports;
CREATE POLICY "Staff manage reports" ON public.community_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Policies: media
DROP POLICY IF EXISTS "Report participants read media" ON public.community_report_media;
CREATE POLICY "Report participants read media" ON public.community_report_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_reports WHERE id = report_id AND citizen_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

DROP POLICY IF EXISTS "Users upload media" ON public.community_report_media;
CREATE POLICY "Users upload media" ON public.community_report_media
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Policies: responses
DROP POLICY IF EXISTS "Citizens read own report responses" ON public.report_responses;
CREATE POLICY "Citizens read own report responses" ON public.report_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_reports WHERE id = report_id AND citizen_id = auth.uid())
    AND is_internal_note = FALSE
  );

DROP POLICY IF EXISTS "Citizens add report responses" ON public.report_responses;
CREATE POLICY "Citizens add report responses" ON public.report_responses
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_internal_note = FALSE);

DROP POLICY IF EXISTS "Staff manage report responses" ON public.report_responses;
CREATE POLICY "Staff manage report responses" ON public.report_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_community_reports_updated ON public.community_reports;
CREATE TRIGGER trigger_community_reports_updated
  BEFORE UPDATE ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.trigger_tickets_updated_at();

-- Seed routing rules for reports
INSERT INTO public.department_routing_rules (category, category_type, department_id, priority) VALUES
  ('road_damage', 'report', (SELECT id FROM public.government_departments WHERE code = 'TNR' LIMIT 1), 'high'),
  ('water_supply', 'report', (SELECT id FROM public.government_departments WHERE code = 'DAWASA' LIMIT 1), 'high'),
  ('waste_collection', 'report', (SELECT id FROM public.government_departments WHERE code = 'NEMC' LIMIT 1), 'normal'),
  ('street_lights', 'report', (SELECT id FROM public.government_departments WHERE code = 'TANESCO' LIMIT 1), 'normal'),
  ('security_issues', 'report', (SELECT id FROM public.government_departments WHERE code = 'TPF' LIMIT 1), 'urgent'),
  ('public_health', 'report', (SELECT id FROM public.government_departments WHERE code = 'MOH' LIMIT 1), 'high'),
  ('illegal_activities', 'report', (SELECT id FROM public.government_departments WHERE code = 'TPF' LIMIT 1), 'urgent')
ON CONFLICT (category, category_type) DO NOTHING;
