-- Run on the app's Supabase project before deploying the guest service.
-- Informational records only: no payment or approval workflow.
BEGIN;
CREATE TABLE public.guest_introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE DEFAULT ('GUEST-' || upper(gen_random_uuid()::text)),
  citizen_id uuid NOT NULL REFERENCES public.users(id),
  guest_type text NOT NULL CHECK (guest_type IN ('family','friend','business','other')),
  guest_name text NOT NULL CHECK (length(trim(guest_name)) BETWEEN 1 AND 500),
  nationality text NOT NULL CHECK (length(trim(nationality)) BETWEEN 1 AND 500),
  phone text NOT NULL DEFAULT '', identity_type text NOT NULL DEFAULT '', identity_number text NOT NULL DEFAULT '',
  origin text NOT NULL CHECK (length(trim(origin)) BETWEEN 1 AND 500),
  purpose text NOT NULL CHECK (length(trim(purpose)) BETWEEN 1 AND 500),
  arrival_date date NOT NULL, departure_date date CHECK (departure_date >= arrival_date),
  premises text NOT NULL CHECK (length(trim(premises)) BETWEEN 1 AND 500),
  host_name text NOT NULL, host_phone text NOT NULL DEFAULT '',
  region text NOT NULL CHECK (length(trim(region)) BETWEEN 1 AND 500),
  district text NOT NULL CHECK (length(trim(district)) BETWEEN 1 AND 500),
  ward text NOT NULL CHECK (length(trim(ward)) BETWEEN 1 AND 500),
  street text NOT NULL CHECK (length(trim(street)) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'filed' CHECK (status = 'filed'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guest_introductions_citizen_created_idx ON public.guest_introductions(citizen_id, created_at DESC);
CREATE INDEX guest_introductions_location_idx ON public.guest_introductions(region, district, ward, street);
ALTER TABLE public.guest_introductions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_introductions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.guest_introductions TO authenticated;
CREATE POLICY "Citizen files own guest information" ON public.guest_introductions FOR INSERT TO authenticated
WITH CHECK (citizen_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'citizen'));
CREATE POLICY "Citizen reads own guest information" ON public.guest_introductions FOR SELECT TO authenticated
USING (citizen_id = (SELECT auth.uid()));
CREATE POLICY "Local staff read filed guest records" ON public.guest_introductions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (
  u.role = 'admin' OR (u.role = 'staff' AND u.region = guest_introductions.region
    AND u.district = guest_introductions.district AND u.ward = guest_introductions.ward
    AND u.street = guest_introductions.street))));
COMMIT;
