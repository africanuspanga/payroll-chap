-- Step 4: Core payroll and HR domain model (v1 baseline)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payroll_period_status' and typnamespace = 'public'::regnamespace) then
    create type public.payroll_period_status as enum ('open', 'locked', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'payroll_run_status' and typnamespace = 'public'::regnamespace) then
    create type public.payroll_run_status as enum ('draft', 'validated', 'approved', 'locked', 'paid');
  end if;

  if not exists (select 1 from pg_type where typname = 'leave_request_status' and typnamespace = 'public'::regnamespace) then
    create type public.leave_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'filing_status' and typnamespace = 'public'::regnamespace) then
    create type public.filing_status as enum ('draft', 'ready', 'submitted', 'paid', 'amended');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_batch_status' and typnamespace = 'public'::regnamespace) then
    create type public.payment_batch_status as enum ('draft', 'exported', 'processing', 'completed', 'failed');
  end if;
end;
$$;

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  starts_on date not null,
  ends_on date not null,
  payment_date date,
  status public.payroll_period_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, period_year, period_month)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_no text,
  first_name text not null,
  last_name text not null,
  work_email text,
  personal_email text,
  phone text,
  date_of_birth date,
  hire_date date not null,
  termination_date date,
  employment_type text not null default 'permanent',
  is_active boolean not null default true,
  tax_residency text not null default 'resident',
  is_primary_employment boolean not null default true,
  tin text,
  nssf_no text,
  wcf_no text,
  payment_method text not null default 'bank',
  bank_name text,
  bank_account_no text,
  mobile_money_provider text,
  mobile_money_no text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, employee_no)
);

create index if not exists idx_employees_company_id on public.employees (company_id);

create table if not exists public.employee_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  contract_type text not null,
  effective_from date not null,
  effective_to date,
  basic_salary numeric(14,2) not null default 0,
  salary_frequency text not null default 'monthly',
  currency_code text not null default 'TZS',
  probation_end_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.earning_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  is_taxable boolean not null default true,
  is_statutory boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.deduction_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  is_pre_tax boolean not null default false,
  is_statutory boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.employee_recurring_earnings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  earning_type_id uuid not null references public.earning_types(id),
  amount numeric(14,2) not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_recurring_deductions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  deduction_type_id uuid not null references public.deduction_types(id),
  amount numeric(14,2) not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  run_label text not null default 'main',
  status public.payroll_run_status not null default 'draft',
  gross_total numeric(16,2) not null default 0,
  deduction_total numeric(16,2) not null default 0,
  net_total numeric(16,2) not null default 0,
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  gross_pay numeric(14,2) not null default 0,
  taxable_pay numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  calc_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (payroll_run_id, employee_id)
);

create table if not exists public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  accrual_days_per_year numeric(8,2) not null default 0,
  carry_over_limit numeric(8,2),
  is_paid boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_policy_id uuid not null references public.leave_policies(id),
  balance_days numeric(8,2) not null default 0,
  as_of date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, leave_policy_id, as_of)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_policy_id uuid not null references public.leave_policies(id),
  starts_on date not null,
  ends_on date not null,
  days_requested numeric(8,2) not null,
  status public.leave_request_status not null default 'pending',
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  decision_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.filing_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  filing_type text not null,
  due_date date not null,
  status public.filing_status not null default 'draft',
  amount_due numeric(14,2) not null default 0,
  submission_reference text,
  payment_reference text,
  filed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  provider text not null,
  status public.payment_batch_status not null default 'draft',
  file_uri text,
  total_amount numeric(16,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_batch_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_batch_id uuid not null references public.payment_batches(id) on delete cascade,
  payroll_run_item_id uuid not null references public.payroll_run_items(id) on delete cascade,
  amount numeric(14,2) not null,
  destination_account text,
  provider_reference text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gl_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  export_format text not null,
  export_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

-- updated_at triggers
do $$
declare
  table_name text;
begin
  for table_name in
    select unnest(array[
      'payroll_periods',
      'employees',
      'employee_contracts',
      'payroll_runs',
      'leave_requests'
    ])
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I;', table_name, table_name);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at();',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- enable RLS on company-scoped tables
alter table public.payroll_periods enable row level security;
alter table public.employees enable row level security;
alter table public.employee_contracts enable row level security;
alter table public.earning_types enable row level security;
alter table public.deduction_types enable row level security;
alter table public.employee_recurring_earnings enable row level security;
alter table public.employee_recurring_deductions enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_run_items enable row level security;
alter table public.leave_policies enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.filing_returns enable row level security;
alter table public.payment_batches enable row level security;
alter table public.payment_batch_items enable row level security;
alter table public.gl_exports enable row level security;

create or replace function public.apply_company_rls(p_table regclass)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('drop policy if exists %I_select_member on %s;', p_table::text || '_select_member', p_table);
  execute format('drop policy if exists %I_insert_operator on %s;', p_table::text || '_insert_operator', p_table);
  execute format('drop policy if exists %I_update_operator on %s;', p_table::text || '_update_operator', p_table);

  execute format(
    'create policy %I_select_member on %s for select using (public.is_company_member(company_id));',
    p_table::text || '_select_member',
    p_table
  );
  execute format(
    'create policy %I_insert_operator on %s for insert with check (public.has_company_role(company_id, array[''owner'',''admin'',''accountant'']::public.app_role[]));',
    p_table::text || '_insert_operator',
    p_table
  );
  execute format(
    'create policy %I_update_operator on %s for update using (public.has_company_role(company_id, array[''owner'',''admin'',''accountant'']::public.app_role[])) with check (public.has_company_role(company_id, array[''owner'',''admin'',''accountant'']::public.app_role[]));',
    p_table::text || '_update_operator',
    p_table
  );
end;
$$;

select public.apply_company_rls('public.payroll_periods'::regclass);
select public.apply_company_rls('public.employees'::regclass);
select public.apply_company_rls('public.employee_contracts'::regclass);
select public.apply_company_rls('public.earning_types'::regclass);
select public.apply_company_rls('public.deduction_types'::regclass);
select public.apply_company_rls('public.employee_recurring_earnings'::regclass);
select public.apply_company_rls('public.employee_recurring_deductions'::regclass);
select public.apply_company_rls('public.payroll_runs'::regclass);
select public.apply_company_rls('public.payroll_run_items'::regclass);
select public.apply_company_rls('public.leave_policies'::regclass);
select public.apply_company_rls('public.leave_balances'::regclass);
select public.apply_company_rls('public.leave_requests'::regclass);
select public.apply_company_rls('public.filing_returns'::regclass);
select public.apply_company_rls('public.payment_batches'::regclass);
select public.apply_company_rls('public.payment_batch_items'::regclass);
select public.apply_company_rls('public.gl_exports'::regclass);

-- stricter deletes for owner only
create policy employees_delete_owner
on public.employees
for delete
using (public.has_company_role(company_id, array['owner']::public.app_role[]));

create policy payroll_runs_delete_owner
on public.payroll_runs
for delete
using (public.has_company_role(company_id, array['owner']::public.app_role[]));

drop function if exists public.apply_company_rls(regclass);
