-- ════════════════════════════════════════════════════════════════════════════
-- OFFICE REGISTRY MODULE — Phase 2
-- Run in Supabase SQL Editor: project xuhilnejpqvbfukyhefi
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Rebuild offices table with full hierarchy support ──────────────────────
-- Office levels: regional → district → ward → mtaa (street/village) + department
CREATE TABLE IF NOT EXISTS public.office_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code     TEXT UNIQUE NOT NULL,                 -- e.g. DSM-ILA-KAR-Mchikichini-001
  name            TEXT NOT NULL,
  name_sw         TEXT,
  name_en         TEXT,
  office_type     TEXT NOT NULL CHECK (office_type IN ('regional','district','ward','mtaa','department')),
  -- Hierarchy
  parent_id       UUID REFERENCES public.office_registry(id) ON DELETE SET NULL,
  -- Location
  region          TEXT,
  district        TEXT,
  ward            TEXT,
  mtaa            TEXT,                                  -- street / village name
  -- Department-specific (when office_type = 'department')
  department_type TEXT,                                  -- e.g. 'police','health','land'
  -- Contact
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  -- Officer-in-charge
  head_officer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  head_officer_name TEXT,
  -- Streets served (for mtaa offices) — array of street names
  served_streets  TEXT[] DEFAULT '{}',
  -- Status
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_office_registry_type   ON public.office_registry(office_type);
CREATE INDEX IF NOT EXISTS idx_office_registry_parent ON public.office_registry(parent_id);
CREATE INDEX IF NOT EXISTS idx_office_registry_region ON public.office_registry(region);
CREATE INDEX IF NOT EXISTS idx_office_registry_active ON public.office_registry(active);
CREATE INDEX IF NOT EXISTS idx_office_registry_streets ON public.office_registry USING GIN(served_streets);

-- ── 2. Citizen / application office assignment columns ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='assigned_office_id') THEN
    ALTER TABLE public.users ADD COLUMN assigned_office_id UUID REFERENCES public.office_registry(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='office_registry_id') THEN
    ALTER TABLE public.applications ADD COLUMN office_registry_id UUID REFERENCES public.office_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_assigned_office ON public.users(assigned_office_id);

-- ── 3. Server-side office code generation ────────────────────────────────────
-- Format: {RegionAbbr}-{DistrictAbbr}-{WardAbbr}-{MtaaName}-{Serial}
CREATE OR REPLACE FUNCTION public.generate_office_code(
  p_office_type TEXT,
  p_region TEXT,
  p_district TEXT DEFAULT NULL,
  p_ward TEXT DEFAULT NULL,
  p_mtaa TEXT DEFAULT NULL,
  p_department_type TEXT DEFAULT NULL
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_reg  TEXT;
  v_dist TEXT;
  v_ward TEXT;
  v_mtaa TEXT;
  v_prefix TEXT;
  v_serial INT;
  v_code TEXT;
BEGIN
  -- 3-letter uppercase abbreviations
  v_reg  := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_region, 'XXX'), '[^a-zA-Z]', '', 'g'), 3));
  v_dist := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_district, ''), '[^a-zA-Z]', '', 'g'), 3));
  v_ward := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_ward, ''), '[^a-zA-Z]', '', 'g'), 3));
  -- Mtaa keeps its name (cleaned, capitalised first letter)
  v_mtaa := REGEXP_REPLACE(COALESCE(p_mtaa, ''), '[^a-zA-Z0-9]', '', 'g');

  -- Build prefix by office type
  v_prefix := CASE p_office_type
    WHEN 'regional'   THEN v_reg || '-Regional'
    WHEN 'district'   THEN v_reg || '-' || v_dist || '-District'
    WHEN 'ward'       THEN v_reg || '-' || v_dist || '-' || v_ward || '-Ward'
    WHEN 'mtaa'       THEN v_reg || '-' || v_dist || '-' || v_ward || '-' || v_mtaa
    WHEN 'department' THEN v_reg || '-' || v_dist || '-' || v_ward || '-' || UPPER(LEFT(COALESCE(p_department_type,'DEP'),4))
    ELSE v_reg
  END;

  -- Next serial for this prefix
  SELECT COALESCE(MAX(CAST(RIGHT(office_code, 3) AS INT)), 0) + 1
  INTO v_serial
  FROM public.office_registry
  WHERE office_code LIKE v_prefix || '-%'
    AND RIGHT(office_code, 3) ~ '^[0-9]{3}$';

  v_code := v_prefix || '-' || LPAD(v_serial::TEXT, 3, '0');
  RETURN v_code;
END;
$$;

-- Auto-assign office_code on insert if not provided
CREATE OR REPLACE FUNCTION public.set_office_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.office_code IS NULL OR NEW.office_code = '' THEN
    NEW.office_code := public.generate_office_code(
      NEW.office_type, NEW.region, NEW.district, NEW.ward, NEW.mtaa, NEW.department_type
    );
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_office_code ON public.office_registry;
CREATE TRIGGER trg_set_office_code
  BEFORE INSERT OR UPDATE ON public.office_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_office_code();

-- ── 4. Street → office assignment lookup ─────────────────────────────────────
-- Given a citizen's region/district/ward/street, find the best office:
--   1. Mtaa office whose served_streets contains the street
--   2. Mtaa office matching mtaa name
--   3. Fallback: Ward office
--   4. Fallback: District office → Regional office
CREATE OR REPLACE FUNCTION public.find_office_for_address(
  p_region TEXT, p_district TEXT, p_ward TEXT, p_street TEXT
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
  -- 1. Mtaa office serving this street
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='mtaa' AND active
    AND region=p_region AND district=p_district AND ward=p_ward
    AND p_street = ANY(served_streets)
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 2. Mtaa office matching mtaa name = street
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='mtaa' AND active
    AND region=p_region AND district=p_district AND ward=p_ward
    AND (mtaa ILIKE p_street OR mtaa ILIKE '%'||p_street||'%')
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 3. Ward office
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='ward' AND active
    AND region=p_region AND district=p_district AND ward=p_ward
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 4. District office
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='district' AND active
    AND region=p_region AND district=p_district
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 5. Regional office
  SELECT id INTO v_id FROM public.office_registry
  WHERE office_type='regional' AND active AND region=p_region
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.office_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS office_registry_select ON public.office_registry;
CREATE POLICY office_registry_select ON public.office_registry
  FOR SELECT USING (true);  -- everyone can read offices (needed for assignment lookup)

DROP POLICY IF EXISTS office_registry_admin_all ON public.office_registry;
CREATE POLICY office_registry_admin_all ON public.office_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.role='admin')
  );

GRANT EXECUTE ON FUNCTION public.generate_office_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_office_for_address TO anon, authenticated;

-- ── 6. Audit notification table for unmapped streets (optional helper) ───────
-- Reuses existing notifications — no new table needed.
