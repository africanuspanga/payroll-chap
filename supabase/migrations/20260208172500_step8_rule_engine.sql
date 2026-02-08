-- Step 8: Statutory rule versioning foundation

create table if not exists public.statutory_rule_sets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  country_code text not null default 'TZ',
  jurisdiction text not null default 'mainland',
  rule_code text not null,
  version text not null,
  effective_from date not null,
  effective_to date,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (country_code, jurisdiction, rule_code, version)
);

create table if not exists public.statutory_rule_entries (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.statutory_rule_sets(id) on delete cascade,
  key text not null,
  value jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rule_set_id, key)
);

alter table public.statutory_rule_sets enable row level security;
alter table public.statutory_rule_entries enable row level security;

create policy statutory_rule_sets_select
on public.statutory_rule_sets
for select
using (
  company_id is null
  or public.is_company_member(company_id)
);

create policy statutory_rule_sets_insert_owner
on public.statutory_rule_sets
for insert
with check (
  company_id is null
  or public.has_company_role(company_id, array['owner']::public.app_role[])
);

create policy statutory_rule_sets_update_owner
on public.statutory_rule_sets
for update
using (
  company_id is null
  or public.has_company_role(company_id, array['owner']::public.app_role[])
)
with check (
  company_id is null
  or public.has_company_role(company_id, array['owner']::public.app_role[])
);

create policy statutory_rule_entries_select
on public.statutory_rule_entries
for select
using (
  exists (
    select 1
    from public.statutory_rule_sets rs
    where rs.id = statutory_rule_entries.rule_set_id
      and (rs.company_id is null or public.is_company_member(rs.company_id))
  )
);

create policy statutory_rule_entries_insert_owner
on public.statutory_rule_entries
for insert
with check (
  exists (
    select 1
    from public.statutory_rule_sets rs
    where rs.id = statutory_rule_entries.rule_set_id
      and (rs.company_id is null or public.has_company_role(rs.company_id, array['owner']::public.app_role[]))
  )
);
