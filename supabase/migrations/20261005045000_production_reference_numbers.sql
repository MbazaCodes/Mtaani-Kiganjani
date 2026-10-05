-- Production-safe human-readable reference generation.
-- Primary UUIDs remain the canonical identifiers; these references are display/operational IDs.
-- Apply this migration before deploying clients that omit application_number/ticket_number/report_number.

create sequence if not exists public.application_reference_seq;
create sequence if not exists public.support_ticket_reference_seq;
create sequence if not exists public.community_report_reference_seq;

create or replace function public.set_application_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.application_number is null or btrim(new.application_number) = '' then
    new.application_number :=
      'TZ-' || to_char(current_date, 'YYYYMMDD') || '-' ||
      lpad(nextval('public.application_reference_seq')::text, 8, '0');
  end if;
  return new;
end;
$$;

create or replace function public.set_support_ticket_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ticket_number is null or btrim(new.ticket_number) = '' then
    new.ticket_number :=
      'TK-' || to_char(current_date, 'YYYYMMDD') || '-' ||
      lpad(nextval('public.support_ticket_reference_seq')::text, 8, '0');
  end if;
  return new;
end;
$$;

create or replace function public.set_community_report_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.report_number is null or btrim(new.report_number) = '' then
    new.report_number :=
      'CR-' || to_char(current_date, 'YYYYMMDD') || '-' ||
      lpad(nextval('public.community_report_reference_seq')::text, 8, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_application_reference on public.applications;
create trigger trg_set_application_reference
before insert on public.applications
for each row execute function public.set_application_reference();

drop trigger if exists trg_set_support_ticket_reference on public.support_tickets;
create trigger trg_set_support_ticket_reference
before insert on public.support_tickets
for each row execute function public.set_support_ticket_reference();

drop trigger if exists trg_set_community_report_reference on public.community_reports;
create trigger trg_set_community_report_reference
before insert on public.community_reports
for each row execute function public.set_community_report_reference();

alter table public.applications
  alter column application_number set not null;

-- Existing UNIQUE constraints on these columns provide collision protection.

-- Business registration identifiers are also authoritative operational references.
create sequence if not exists public.business_reference_seq;

create or replace function public.set_business_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_prefix text;
begin
  if new.status = 'approved' and (new.business_id is null or btrim(new.business_id) = '') then
    ref_prefix := case
      when new.business_type::text = 'seller' then 'SL'
      when new.business_type::text = 'landlord' then 'LL'
      else 'BR'
    end;
    new.business_id :=
      ref_prefix || to_char(current_date, 'YYYY') ||
      lpad(nextval('public.business_reference_seq')::text, 8, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_business_reference on public.business_registrations;
create trigger trg_set_business_reference
before insert or update of status on public.business_registrations
for each row execute function public.set_business_reference();
