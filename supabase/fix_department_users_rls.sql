-- Fix: ensure department staff can read their own assignments
-- (sidebar needs this to detect department membership)
-- Safe to re-run.

-- Allow ALL authenticated users to check if they are in a department
DROP POLICY IF EXISTS "Department users read own assignments" ON public.department_users;
DROP POLICY IF EXISTS "Users check own department membership" ON public.department_users;
CREATE POLICY "Users check own department membership" ON public.department_users
  FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Also allow staff/admin to read all department_users (for admin views)
DROP POLICY IF EXISTS "Staff read all department users" ON public.department_users;
CREATE POLICY "Staff read all department users" ON public.department_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );
