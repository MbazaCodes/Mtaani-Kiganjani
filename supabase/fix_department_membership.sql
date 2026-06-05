-- ============================================================
-- GUARANTEED FIX: Store department_id on the users table
-- so the profile fetch (which already works) includes it.
-- No department_users RLS query needed.
-- Safe to re-run.
-- ============================================================

-- 1. Add department_id column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.government_departments(id);

-- 2. Backfill: copy department_id from department_users for existing members
UPDATE public.users u
SET department_id = du.department_id
FROM public.department_users du
WHERE du.user_id = u.id
  AND u.department_id IS NULL;

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id)
  WHERE department_id IS NOT NULL;

-- 4. Also fix department_users RLS while we're at it
DROP POLICY IF EXISTS "Department users read own assignments" ON public.department_users;
DROP POLICY IF EXISTS "Users check own department membership" ON public.department_users;
DROP POLICY IF EXISTS "Staff read all department users" ON public.department_users;

CREATE POLICY "Users check own department membership" ON public.department_users
  FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Staff read all department users" ON public.department_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );
