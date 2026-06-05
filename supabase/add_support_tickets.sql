-- ============================================================
-- MODULE 2: Citizen Support Center — Ticket System
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Ticket status enum
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'submitted', 'under_review', 'assigned', 'in_progress',
    'escalated', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ticket priority enum
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  citizen_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority DEFAULT 'normal',
  status ticket_status DEFAULT 'submitted',
  -- Location (from citizen profile at submission)
  region TEXT,
  district TEXT,
  ward TEXT,
  street TEXT,
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

-- 2. Support Responses (thread)
CREATE TABLE IF NOT EXISTS public.support_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Support Attachments
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_data TEXT, -- base64 for now (migrate to Supabase Storage later)
  file_name TEXT,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_citizen ON public.support_tickets(citizen_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_department ON public.support_tickets(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ward ON public.support_tickets(ward);
CREATE INDEX IF NOT EXISTS idx_tickets_district ON public.support_tickets(district);
CREATE INDEX IF NOT EXISTS idx_tickets_region ON public.support_tickets(region);
CREATE INDEX IF NOT EXISTS idx_responses_ticket ON public.support_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON public.support_attachments(ticket_id);

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

-- Policies: support_tickets
DROP POLICY IF EXISTS "Citizens read own tickets" ON public.support_tickets;
CREATE POLICY "Citizens read own tickets" ON public.support_tickets
  FOR SELECT USING (citizen_id = auth.uid());

DROP POLICY IF EXISTS "Citizens create tickets" ON public.support_tickets;
CREATE POLICY "Citizens create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (citizen_id = auth.uid());

DROP POLICY IF EXISTS "Staff manage tickets" ON public.support_tickets;
CREATE POLICY "Staff manage tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Policies: support_responses
DROP POLICY IF EXISTS "Citizens read own ticket responses" ON public.support_responses;
CREATE POLICY "Citizens read own ticket responses" ON public.support_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND citizen_id = auth.uid())
    AND is_internal_note = FALSE
  );

DROP POLICY IF EXISTS "Citizens add responses" ON public.support_responses;
CREATE POLICY "Citizens add responses" ON public.support_responses
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND is_internal_note = FALSE
  );

DROP POLICY IF EXISTS "Staff manage responses" ON public.support_responses;
CREATE POLICY "Staff manage responses" ON public.support_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Policies: support_attachments
DROP POLICY IF EXISTS "Ticket participants read attachments" ON public.support_attachments;
CREATE POLICY "Ticket participants read attachments" ON public.support_attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND citizen_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

DROP POLICY IF EXISTS "Users upload attachments" ON public.support_attachments;
CREATE POLICY "Users upload attachments" ON public.support_attachments
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.trigger_tickets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trigger_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_tickets_updated_at();

-- Department routing rules
CREATE TABLE IF NOT EXISTS public.department_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  category_type TEXT DEFAULT 'ticket' CHECK (category_type IN ('ticket', 'report')),
  department_id UUID REFERENCES public.government_departments(id) ON DELETE CASCADE,
  priority ticket_priority DEFAULT 'normal',
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(category, category_type)
);

ALTER TABLE public.department_routing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage routing rules" ON public.department_routing_rules;
CREATE POLICY "Staff manage routing rules" ON public.department_routing_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

DROP POLICY IF EXISTS "All read routing rules" ON public.department_routing_rules;
CREATE POLICY "All read routing rules" ON public.department_routing_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed default routing rules
INSERT INTO public.department_routing_rules (category, category_type, department_id, priority) VALUES
  ('infrastructure_issue', 'ticket', (SELECT id FROM public.government_departments WHERE code = 'TNR' LIMIT 1), 'high'),
  ('utilities_issue', 'ticket', (SELECT id FROM public.government_departments WHERE code = 'DAWASA' LIMIT 1), 'high'),
  ('security_concern', 'ticket', (SELECT id FROM public.government_departments WHERE code = 'TPF' LIMIT 1), 'urgent'),
  ('public_health_concern', 'ticket', (SELECT id FROM public.government_departments WHERE code = 'MOH' LIMIT 1), 'high'),
  ('environmental_concern', 'ticket', (SELECT id FROM public.government_departments WHERE code = 'NEMC' LIMIT 1), 'normal'),
  ('corruption_report', 'ticket', (SELECT id FROM public.government_departments WHERE code = 'TAKUKURU' LIMIT 1), 'urgent')
ON CONFLICT (category, category_type) DO NOTHING;
