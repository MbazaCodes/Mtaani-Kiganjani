-- Site statistics: total visit counter (online count is realtime, no table needed)
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.site_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_visits BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single global row
INSERT INTO public.site_stats (id, total_visits)
VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

-- RPC to atomically increment visits (callable by anyone, including anon)
CREATE OR REPLACE FUNCTION public.increment_site_visits()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total BIGINT;
BEGIN
  UPDATE public.site_stats
  SET total_visits = total_visits + 1,
      updated_at = now()
  WHERE id = 'global'
  RETURNING total_visits INTO new_total;
  RETURN COALESCE(new_total, 0);
END;
$$;

-- Allow anonymous + authenticated to call the increment RPC and read stats
GRANT EXECUTE ON FUNCTION public.increment_site_visits() TO anon, authenticated;

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_stats_read_all" ON public.site_stats;
CREATE POLICY "site_stats_read_all" ON public.site_stats
  FOR SELECT USING (true);
