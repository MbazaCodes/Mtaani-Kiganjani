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
