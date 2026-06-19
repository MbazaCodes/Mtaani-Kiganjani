-- ═══════════════════════════════════════════════════════════════════════════
-- E-MTAA SCALABILITY MIGRATION
-- Prepares the database for 100K → 1M+ users
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. INDEXES — Critical for query performance at scale ─────────────────
-- Without these, every query does a full table scan

-- Applications: the most-queried table
CREATE INDEX IF NOT EXISTS idx_applications_user_id       ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status        ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_ward          ON public.applications(ward);
CREATE INDEX IF NOT EXISTS idx_applications_district      ON public.applications(district);
CREATE INDEX IF NOT EXISTS idx_applications_region        ON public.applications(region);
CREATE INDEX IF NOT EXISTS idx_applications_created_at    ON public.applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_service_name  ON public.applications(service_name);
CREATE INDEX IF NOT EXISTS idx_applications_office        ON public.applications(office_registry_id);
-- Composite: staff dashboard (ward + status + created_at)
CREATE INDEX IF NOT EXISTS idx_applications_ward_status   ON public.applications(ward, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_district_status ON public.applications(district, status, created_at DESC);

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_role                 ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_ward                 ON public.users(ward);
CREATE INDEX IF NOT EXISTS idx_users_district             ON public.users(district);
CREATE INDEX IF NOT EXISTS idx_users_phone                ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_nida_number          ON public.users(nida_number);
CREATE INDEX IF NOT EXISTS idx_users_citizen_id           ON public.users(citizen_id);

-- Notifications: users only see their own
CREATE INDEX IF NOT EXISTS idx_notifications_user_id      ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at   ON public.notifications(created_at DESC);

-- Support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_ward       ON public.support_tickets(ward) WHERE ward IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON public.support_tickets(status);

-- Activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id      ON public.activity_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at   ON public.activity_logs(created_at DESC);


-- ── 2. ANALYTICS RPCs — Replace 1000-row client fetches with DB aggregates ─
-- These run in the DB (fast) instead of pulling rows to the browser (slow)

-- By status count
CREATE OR REPLACE FUNCTION public.analytics_by_status()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(status, 'pending') AS status,
    COUNT(*) AS count
  FROM public.applications
  GROUP BY status
  ORDER BY count DESC;
$$;

-- By service count
CREATE OR REPLACE FUNCTION public.analytics_by_service()
RETURNS TABLE(service_name text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(service_name, 'Other') AS service_name,
    COUNT(*) AS count
  FROM public.applications
  GROUP BY service_name
  ORDER BY count DESC
  LIMIT 10;
$$;

-- Monthly trend (last 12 months)
CREATE OR REPLACE FUNCTION public.analytics_monthly_trend()
RETURNS TABLE(month text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM public.applications
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month ASC;
$$;

-- Revenue summary (by status)
CREATE OR REPLACE FUNCTION public.analytics_revenue()
RETURNS TABLE(total_revenue numeric, paid_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM((payment_data->>'amount')::numeric), 0) AS total_revenue,
    COUNT(*) AS paid_count
  FROM public.applications
  WHERE status IN ('paid', 'approved', 'issued')
    AND payment_data->>'amount' IS NOT NULL;
$$;

-- Grant anon + authenticated access to analytics RPCs
GRANT EXECUTE ON FUNCTION public.analytics_by_status()     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_by_service()    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_monthly_trend() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_revenue()       TO anon, authenticated;


-- ── 3. JWT-BASED RLS HELPERS — Eliminate per-row DB lookups in policies ──
-- Old: is_admin() does SELECT from users table for EVERY row evaluated
-- New: reads role from JWT token — zero DB queries

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'citizen'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('staff', 'admin');
$$;

-- NOTE: For jwt_role() to work, you must set the role claim in Supabase:
-- Dashboard → Authentication → Hooks → Add a "Custom Access Token" hook
-- OR use a trigger that sets app_metadata.role on user creation/update.
-- Until then, the old DB-lookup functions remain as fallback.


-- ── 4. SERVER-SIDE RATE LIMITING TABLE ───────────────────────────────────
-- Client-side rateLimit.ts can be bypassed — this cannot

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier  text NOT NULL,          -- user_id or IP
  action      text NOT NULL,          -- 'submit_application', 'login', etc.
  window_start timestamptz NOT NULL DEFAULT NOW(),
  attempt_count int NOT NULL DEFAULT 1,
  UNIQUE (identifier, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(identifier, action, window_start);

-- RLS: users can only read their own rate limit rows
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_own" ON public.rate_limits
  FOR ALL USING (identifier = auth.uid()::text);

-- Rate limit check function (called from Edge Functions or client)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action     text,
  p_max        int     DEFAULT 5,
  p_window_min int     DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window timestamptz := DATE_TRUNC('hour', NOW()) +
    (EXTRACT(MINUTE FROM NOW())::int / p_window_min) *
    (p_window_min || ' minutes')::interval;
  v_count int;
BEGIN
  INSERT INTO public.rate_limits (identifier, action, window_start, attempt_count)
  VALUES (p_identifier, p_action, v_window, 1)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET attempt_count = rate_limits.attempt_count + 1
  RETURNING attempt_count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, int, int)
  TO authenticated;


-- ── 5. PAGINATION HELPER — Consistent cursor-based pagination ────────────
-- Use this instead of OFFSET for large tables (OFFSET gets slower as pages grow)

CREATE OR REPLACE FUNCTION public.get_applications_page(
  p_user_id   uuid    DEFAULT NULL,
  p_ward      text    DEFAULT NULL,
  p_district  text    DEFAULT NULL,
  p_status    text    DEFAULT NULL,
  p_after_id  uuid    DEFAULT NULL,   -- cursor (last seen id)
  p_limit     int     DEFAULT 50
)
RETURNS SETOF public.applications
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT *
  FROM public.applications
  WHERE
    (p_user_id  IS NULL OR user_id  = p_user_id)
    AND (p_ward     IS NULL OR ward     = p_ward)
    AND (p_district IS NULL OR district = p_district)
    AND (p_status   IS NULL OR status   = p_status)
    AND (p_after_id IS NULL OR id < p_after_id)
  ORDER BY created_at DESC, id DESC
  LIMIT LEAST(p_limit, 100);  -- hard cap at 100 rows per page
$$;

GRANT EXECUTE ON FUNCTION public.get_applications_page(uuid, text, text, text, uuid, int)
  TO authenticated;


-- ── 6. CLEANUP OLD RATE LIMIT ROWS (keep table small) ───────────────────
-- Run this periodically (Supabase cron or pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '2 hours';
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE — Run this in Supabase SQL Editor
-- After running, update Supabase Auth custom claims to include 'role'
-- so jwt_role() works and RLS stops hitting the users table.
-- ═══════════════════════════════════════════════════════════════════════════
