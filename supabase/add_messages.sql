-- ============================================================
-- MODULE 8: Communications Center
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_department_id UUID REFERENCES public.government_departments(id),
  -- Thread support
  thread_id UUID REFERENCES public.messages(id),
  -- Case linking
  case_type TEXT CHECK (case_type IN ('ticket', 'report', 'application', 'general')),
  case_id UUID,
  case_ref TEXT, -- e.g. TK-20260606-1234
  -- Content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  -- Status
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_department ON public.messages(recipient_department_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_case ON public.messages(case_type, case_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages sent to them or by them
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
CREATE POLICY "Users read own messages" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- Department members can read messages sent to their department
DROP POLICY IF EXISTS "Dept members read dept messages" ON public.messages;
CREATE POLICY "Dept members read dept messages" ON public.messages
  FOR SELECT USING (
    recipient_department_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.department_users
      WHERE user_id = auth.uid() AND department_id = recipient_department_id
    )
  );

-- Staff can read all messages in their area
DROP POLICY IF EXISTS "Staff read area messages" ON public.messages;
CREATE POLICY "Staff read area messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Anyone can send messages
DROP POLICY IF EXISTS "Users send messages" ON public.messages;
CREATE POLICY "Users send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Users can update their own received messages (mark read)
DROP POLICY IF EXISTS "Users update own messages" ON public.messages;
CREATE POLICY "Users update own messages" ON public.messages
  FOR UPDATE USING (recipient_id = auth.uid() OR sender_id = auth.uid());
