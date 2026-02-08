-- Step 6: Attendance and timesheet ingestion foundation

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  hours_worked numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  late_minutes int not null default 0,
  source text not null default 'manual',
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, work_date, source)
);

create table if not exists public.attendance_import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  source_uri text,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.timesheets enable row level security;
alter table public.attendance_import_jobs enable row level security;

create policy timesheets_select_member
on public.timesheets
for select
using (public.is_company_member(company_id));

create policy timesheets_insert_operator
on public.timesheets
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

create policy timesheets_update_operator
on public.timesheets
for update
using (public.has_company_role(company_id, array['owner','admin']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));

create policy attendance_import_jobs_select_member
on public.attendance_import_jobs
for select
using (public.is_company_member(company_id));

create policy attendance_import_jobs_insert_admin
on public.attendance_import_jobs
for insert
with check (public.has_company_role(company_id, array['owner','admin']::public.app_role[]));
