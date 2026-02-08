-- Step 9 deep: filing lifecycle, amendments, submission metadata, and penalties

alter table public.filing_returns
  add column if not exists original_filing_id uuid references public.filing_returns(id) on delete set null,
  add column if not exists amended_reason text,
  add column if not exists penalty_amount numeric(14,2) not null default 0,
  add column if not exists interest_amount numeric(14,2) not null default 0,
  add column if not exists submitted_by uuid references auth.users(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists paid_at timestamptz;

create table if not exists public.filing_status_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  filing_return_id uuid not null references public.filing_returns(id) on delete cascade,
  from_status public.filing_status,
  to_status public.filing_status not null,
  notes text,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_filing_status_events_company_filing
  on public.filing_status_events (company_id, filing_return_id, created_at desc);

alter table public.filing_status_events enable row level security;

drop policy if exists filing_status_events_select_member on public.filing_status_events;
create policy filing_status_events_select_member
on public.filing_status_events
for select
using (public.is_company_member(company_id));

drop policy if exists filing_status_events_insert_operator on public.filing_status_events;
create policy filing_status_events_insert_operator
on public.filing_status_events
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));
