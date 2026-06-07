-- Fix: allow citizens to read applications where they are named as buyer/tenant in form_data
-- This covers cases where second_party_user_id wasn't set but buyer_id/tenant_id is in form_data
-- Safe to re-run.

-- Ensure the second_party policy exists
DROP POLICY IF EXISTS "applications_select_second_party" ON public.applications;
CREATE POLICY "applications_select_second_party" ON public.applications
  FOR SELECT USING (
    auth.uid() = second_party_user_id 
    OR auth.uid() = target_user_id
  );

-- Add policy for form_data buyer/tenant lookup
DROP POLICY IF EXISTS "applications_select_form_party" ON public.applications;
CREATE POLICY "applications_select_form_party" ON public.applications
  FOR SELECT USING (
    (form_data->>'buyer_id')::uuid = auth.uid()
    OR (form_data->>'tenant_id')::uuid = auth.uid()
  );

-- Allow buyer/tenant to update agreement_status on applications filed with them
DROP POLICY IF EXISTS "applications_update_second_party" ON public.applications;
CREATE POLICY "applications_update_second_party" ON public.applications
  FOR UPDATE USING (
    auth.uid() = second_party_user_id
    OR auth.uid() = target_user_id
    OR (form_data->>'buyer_id')::uuid = auth.uid()
    OR (form_data->>'tenant_id')::uuid = auth.uid()
  );

-- Allow second party (buyer/tenant) to update agreement-related fields
-- on applications where they are the second_party_user_id.
-- This is needed for the buyer to accept/reject agreements.

DROP POLICY IF EXISTS "applications_update_second_party" ON public.applications;
CREATE POLICY "applications_update_second_party" ON public.applications
  FOR UPDATE
  USING (second_party_user_id = auth.uid())
  WITH CHECK (second_party_user_id = auth.uid());

-- Also allow second party to read the application (for form_data fetch)
DROP POLICY IF EXISTS "applications_select_second_party" ON public.applications;
CREATE POLICY "applications_select_second_party" ON public.applications
  FOR SELECT
  USING (second_party_user_id = auth.uid());

-- Allow lookup via form_data buyer_id/tenant_id fields too
DROP POLICY IF EXISTS "applications_select_form_party" ON public.applications;
CREATE POLICY "applications_select_form_party" ON public.applications
  FOR SELECT
  USING (
    form_data->>'buyer_id' = auth.uid()::text
    OR form_data->>'tenant_id' = auth.uid()::text
  );
