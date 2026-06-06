-- Application Messages: per-application chat threads between staff and citizens
-- Each application gets its own conversation thread.
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.application_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  message TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_messages_application ON public.application_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_app_messages_sender ON public.application_messages(sender_id);

ALTER TABLE public.application_messages ENABLE ROW LEVEL SECURITY;

-- Citizens can read messages on their own applications
DROP POLICY IF EXISTS "app_messages_citizen_read" ON public.application_messages;
CREATE POLICY "app_messages_citizen_read" ON public.application_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id AND a.user_id = auth.uid()
    )
  );

-- Citizens can insert messages on their own applications
DROP POLICY IF EXISTS "app_messages_citizen_insert" ON public.application_messages;
CREATE POLICY "app_messages_citizen_insert" ON public.application_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id AND a.user_id = auth.uid()
    )
  );

-- Staff/admin can read all messages
DROP POLICY IF EXISTS "app_messages_staff_read" ON public.application_messages;
CREATE POLICY "app_messages_staff_read" ON public.application_messages
  FOR SELECT USING (public.is_staff_or_admin());

-- Staff/admin can insert messages on any application
DROP POLICY IF EXISTS "app_messages_staff_insert" ON public.application_messages;
CREATE POLICY "app_messages_staff_insert" ON public.application_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND public.is_staff_or_admin()
  );

-- Anyone can mark their received messages as read
DROP POLICY IF EXISTS "app_messages_update_read" ON public.application_messages;
CREATE POLICY "app_messages_update_read" ON public.application_messages
  FOR UPDATE USING (true) WITH CHECK (true);

GRANT ALL ON public.application_messages TO authenticated;
