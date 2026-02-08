-- Seed default Tanzania statutory rules (baseline; verify against latest TRA publications before production use)

with upsert_rule_set as (
  insert into public.statutory_rule_sets (
    company_id,
    country_code,
    jurisdiction,
    rule_code,
    version,
    effective_from,
    is_default,
    notes
  ) values (
    null,
    'TZ',
    'mainland',
    'TZ_PAYROLL_BASELINE',
    'v1',
    '2026-01-01',
    true,
    'Initial baseline from internal compliance specification docs/compliance/tz-v1.md'
  )
  on conflict (country_code, jurisdiction, rule_code, version)
  do update set notes = excluded.notes
  returning id
)
insert into public.statutory_rule_entries (rule_set_id, key, value)
select id, key, value
from upsert_rule_set,
(
  values
    ('SDL_RATE', '{"rate":0.035,"employee_threshold":10}'::jsonb),
    ('SDL_DUE_DAY', '{"day_of_month":7}'::jsonb),
    ('NON_RESIDENT_PAYE_RATE', '{"rate":0.15}'::jsonb),
    ('DIRECTOR_NON_FULL_TIME_RATE', '{"rate":0.15}'::jsonb),
    ('MOTOR_VEHICLE_BIK_ANNUAL', '{"bands":[{"max_engine_cc":1000,"max_age_years":5,"amount":250000},{"max_engine_cc":1000,"min_age_years":6,"amount":125000},{"min_engine_cc":1001,"max_engine_cc":2000,"max_age_years":5,"amount":500000},{"min_engine_cc":1001,"max_engine_cc":2000,"min_age_years":6,"amount":250000},{"min_engine_cc":2001,"max_engine_cc":3000,"max_age_years":5,"amount":1000000},{"min_engine_cc":2001,"max_engine_cc":3000,"min_age_years":6,"amount":500000},{"min_engine_cc":3001,"max_age_years":5,"amount":1500000},{"min_engine_cc":3001,"min_age_years":6,"amount":750000}]}'::jsonb)
) as payload(key, value)
on conflict (rule_set_id, key)
do update set value = excluded.value;
