-- Citizen satisfaction surveys — feedback after service completion
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  service_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_application ON public.satisfaction_surveys(application_id);
CREATE INDEX IF NOT EXISTS idx_surveys_user ON public.satisfaction_surveys(user_id);

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Citizens can insert their own surveys
CREATE POLICY "surveys_citizen_insert" ON public.satisfaction_surveys
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Citizens can read their own surveys
CREATE POLICY "surveys_citizen_read" ON public.satisfaction_surveys
  FOR SELECT USING (user_id = auth.uid());

-- Staff/admin can read all surveys
CREATE POLICY "surveys_staff_read" ON public.satisfaction_surveys
  FOR SELECT USING (public.is_staff_or_admin());

GRANT ALL ON public.satisfaction_surveys TO authenticated;
