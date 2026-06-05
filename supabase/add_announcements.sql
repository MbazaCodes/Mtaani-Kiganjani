-- ============================================================
-- MODULE 4: Announcements
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'public_notice',
  level TEXT NOT NULL CHECK (level IN ('national', 'region', 'district', 'ward', 'street')) DEFAULT 'ward',
  region TEXT,
  district TEXT,
  ward TEXT,
  street TEXT,
  priority TEXT CHECK (priority IN ('normal', 'important', 'urgent')) DEFAULT 'normal',
  published_by UUID REFERENCES public.users(id),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_region ON public.announcements(region);
CREATE INDEX IF NOT EXISTS idx_announcements_district ON public.announcements(district);
CREATE INDEX IF NOT EXISTS idx_announcements_ward ON public.announcements(ward);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active announcements" ON public.announcements;
CREATE POLICY "Anyone reads active announcements" ON public.announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Staff manage announcements" ON public.announcements;
CREATE POLICY "Staff manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );
