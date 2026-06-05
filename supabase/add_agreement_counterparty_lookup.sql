-- ============================================================
-- Agreement counterparty lookup
-- Lets authenticated users find a buyer/tenant by NIDA, phone,
-- or CT ID without exposing broad SELECT access to public.users.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_agreement_counterparty(
  p_search_type TEXT,
  p_search_term TEXT
)
RETURNS TABLE (
  id UUID,
  citizen_id TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  nida_number TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  district TEXT,
  ward TEXT,
  is_verified BOOLEAN,
  account_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.citizen_id,
    u.first_name,
    u.middle_name,
    u.last_name,
    u.nida_number,
    u.phone,
    u.email,
    u.region,
    u.district,
    u.ward,
    COALESCE(u.is_verified, FALSE) AS is_verified,
    COALESCE(u.account_status, 'active') AS account_status
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND u.role = 'citizen'
    AND (
      (UPPER(p_search_type) = 'NIDA' AND u.nida_number = TRIM(p_search_term))
      OR (UPPER(p_search_type) = 'PHONE' AND u.phone = TRIM(p_search_term))
      OR (
        UPPER(p_search_type) = 'CT_ID'
        AND UPPER(u.citizen_id) = UPPER(TRIM(p_search_term))
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.search_agreement_counterparty(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_agreement_counterparty(TEXT, TEXT) TO authenticated;
