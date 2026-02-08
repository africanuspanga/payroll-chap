-- Step 8 deep: PAYE/BIK rule support and employee tax profile extensions

alter table public.employees
  add column if not exists is_non_full_time_director boolean not null default false;

create table if not exists public.employee_benefits_in_kind (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  benefit_type text not null,
  effective_from date not null,
  effective_to date,
  amount numeric(14,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  check (benefit_type in ('housing','vehicle','loan','other'))
);

create index if not exists idx_employee_benefits_in_kind_company_employee
  on public.employee_benefits_in_kind (company_id, employee_id);

alter table public.employee_benefits_in_kind enable row level security;

drop policy if exists employee_benefits_in_kind_select_member on public.employee_benefits_in_kind;
create policy employee_benefits_in_kind_select_member
on public.employee_benefits_in_kind
for select
using (public.is_company_member(company_id));

drop policy if exists employee_benefits_in_kind_insert_operator on public.employee_benefits_in_kind;
create policy employee_benefits_in_kind_insert_operator
on public.employee_benefits_in_kind
for insert
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

drop policy if exists employee_benefits_in_kind_update_operator on public.employee_benefits_in_kind;
create policy employee_benefits_in_kind_update_operator
on public.employee_benefits_in_kind
for update
using (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]))
with check (public.has_company_role(company_id, array['owner','admin','accountant']::public.app_role[]));

-- Seed deeper statutory entries for all TZ baseline rule sets
insert into public.statutory_rule_entries (rule_set_id, key, value)
select rs.id, payload.key, payload.value
from public.statutory_rule_sets rs
cross join (
  values
    (
      'PAYE_BANDS_RESIDENT_PRIMARY',
      '{"bands":[{"from":0,"to":270000,"rate":0.00},{"from":270000.01,"to":520000,"rate":0.08},{"from":520000.01,"to":760000,"rate":0.20},{"from":760000.01,"to":1000000,"rate":0.25},{"from":1000000.01,"to":null,"rate":0.30}]}'::jsonb
    ),
    ('SECONDARY_EMPLOYMENT_RATE', '{"rate":0.30}'::jsonb),
    ('NSSF_EMPLOYEE_RATE', '{"rate":0.10}'::jsonb),
    ('BIK_HOUSING', '{"income_rate":0.15}'::jsonb),
    ('BIK_LOAN', '{"statutory_interest_rate":0.16}'::jsonb),
    ('FILING_PENALTY_DAILY_RATE', '{"rate":0.0005}'::jsonb)
) as payload(key, value)
where rs.country_code = 'TZ'
  and rs.rule_code = 'TZ_PAYROLL_BASELINE'
on conflict (rule_set_id, key)
do update set value = excluded.value;
