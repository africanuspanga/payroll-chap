-- Step 5/6 deep: leave decision metadata and attendance import tracking

alter table public.leave_requests
  add column if not exists decided_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id),
  add column if not exists source text not null default 'manual';

create table if not exists public.timesheet_import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source text not null default 'manual_upload',
  payload_count int not null default 0,
  imported_count int not null default 0,
  rejected_count int not null default 0,
  status text not null default 'completed',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_timesheet_import_batches_company_created
  on public.timesheet_import_batches (company_id, created_at desc);

alter table public.timesheet_import_batches enable row level security;

drop policy if exists timesheet_import_batches_select_member on public.timesheet_import_batches;
create policy timesheet_import_batches_select_member
on public.timesheet_import_batches
for select
using (public.is_company_member(company_id));

drop policy if exists timesheet_import_batches_insert_operator on public.timesheet_import_batches;
create policy timesheet_import_batches_insert_operator
on public.timesheet_import_batches
for insert
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

drop policy if exists timesheet_import_batches_update_operator on public.timesheet_import_batches;
create policy timesheet_import_batches_update_operator
on public.timesheet_import_batches
for update
using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
