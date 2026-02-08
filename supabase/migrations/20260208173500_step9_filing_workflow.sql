-- Step 9: Filing workflow controls

create table if not exists public.filing_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  filing_return_id uuid not null references public.filing_returns(id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default timezone('utc', now()),
  event_by uuid references auth.users(id),
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.compliance_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reminder_type text not null,
  due_date date not null,
  status text not null default 'open',
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, reminder_type, due_date, related_entity_type, related_entity_id)
);

alter table public.filing_events enable row level security;
alter table public.compliance_reminders enable row level security;

create policy filing_events_select_member
on public.filing_events
for select
using (public.is_company_member(company_id));

create policy filing_events_insert_operator
on public.filing_events
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

create policy compliance_reminders_select_member
on public.compliance_reminders
for select
using (public.is_company_member(company_id));

create policy compliance_reminders_insert_operator
on public.compliance_reminders
for insert
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

create policy compliance_reminders_update_operator
on public.compliance_reminders
for update
using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
