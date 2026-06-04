-- ============================================================================
-- Signatures & Stamps support
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Staff reusable signature + official stamp (stored as base64 data URLs)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS stamp_url TEXT;

-- Note: applicant signature, WEO signature and WEO stamp for each application
-- are stored inside applications.form_data (JSONB) as:
--   form_data.applicant_signature  -> citizen's on-screen signature (base64)
--   form_data.weo_signature         -> staff signature applied on approval (base64)
--   form_data.weo_stamp             -> staff official stamp applied on approval (base64)
--   form_data.weo_name              -> name of the approving officer
-- No schema change needed for those since form_data is JSONB.
