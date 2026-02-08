-- Step 11: Accounting integration baseline

create table if not exists public.gl_journal_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  account_code text not null,
  account_name text,
  department_code text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  memo text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_gl_journal_lines_company_run
  on public.gl_journal_lines (company_id, payroll_run_id);

alter table public.gl_journal_lines enable row level security;

create policy gl_journal_lines_select_member
on public.gl_journal_lines
for select
using (public.is_company_member(company_id));

create policy gl_journal_lines_insert_operator
on public.gl_journal_lines
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

create policy gl_journal_lines_update_operator
on public.gl_journal_lines
for update
using (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));
