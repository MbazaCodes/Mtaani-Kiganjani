-- Add missing columns to applications table
-- Run in Supabase SQL Editor: project xuhilnejpqvbfukyhefi

DO $$ BEGIN

  -- Officer 5-step checklist columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_phone_verified') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_phone_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_address_verified') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_address_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_id_verified') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_id_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_witnesses_added') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_witnesses_added BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='checklist_final_approved') THEN
    ALTER TABLE public.applications ADD COLUMN checklist_final_approved BOOLEAN DEFAULT FALSE;
  END IF;

  -- Signature/stamp on users table (for officer approval)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='signature_url') THEN
    ALTER TABLE public.users ADD COLUMN signature_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stamp_url') THEN
    ALTER TABLE public.users ADD COLUMN stamp_url TEXT;
  END IF;

  -- Additional application fields used by the app
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='paid_at') THEN
    ALTER TABLE public.applications ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='buyer_accepted') THEN
    ALTER TABLE public.applications ADD COLUMN buyer_accepted BOOLEAN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='tenant_accepted') THEN
    ALTER TABLE public.applications ADD COLUMN tenant_accepted BOOLEAN;
  END IF;

END $$;

-- Fix applications RLS: allow staff/admin to update any application
DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;
CREATE POLICY "applications_staff_update"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('staff','admin')
    )
  );

-- Fix applications RLS: allow citizens to update their own (second_party acceptance etc)
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
CREATE POLICY "applications_update_own"
  ON public.applications FOR UPDATE
  USING (user_id = auth.uid() OR second_party_user_id = auth.uid());
