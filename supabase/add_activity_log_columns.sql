-- ============================================================================
-- Add missing columns to activity_logs for filtering and display
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success'
    CHECK (status IN ('success', 'pending', 'failed')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT;

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
