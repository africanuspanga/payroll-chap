# Execution Plan (14 Steps)

Last updated: February 8, 2026  
Stack: Next.js App Router + Supabase Auth + Supabase Postgres

## Step 1: Compliance source-of-truth
Status: Executed (draft created)
- File: `docs/compliance/tz-v1.md`
- Output: SDL/PAYE baseline rules, obligations, open legal validation items.

## Step 2: Backend architecture + Supabase auth foundation
Status: Executed
- Files: `lib/supabase/*`, `middleware.ts`, `app/auth/*`, `.env.example`
- Output: App route protection + sign-in/sign-out/callback skeleton for Supabase Auth.

## Step 3: Multi-tenant security + RBAC + audit baseline
Status: Executed
- Migration: `supabase/migrations/20260208170000_step3_core_security.sql`
- Output: companies, memberships, profiles, audit events, helper SQL functions, RLS policies.

## Step 4: Production domain model baseline
Status: Executed (v1 scaffold)
- Migration: `supabase/migrations/20260208171000_step4_domain_core.sql`
- Output: employees, contracts, payroll periods/runs/items, leave, filings, payments, GL export base tables.

## Step 5: Employee lifecycle module
Status: Executed (API + UI baseline)
- Files: `app/employees/page.tsx`, `app/api/v1/employees/*`
- Output: employee onboarding/edit, import, validation, and audit events.

## Step 6: Leave + attendance foundation
Status: Executed (schema + API + CSV import)
- Migration: `supabase/migrations/20260208171500_step6_attendance_timesheets.sql`
- Files: `app/leave/page.tsx`, `app/api/v1/leave-requests/*`, `app/api/v1/timesheets/import/route.ts`
- Output: leave flows + timesheet ingestion + payroll inputs.

## Step 7: Payroll engine v1 draft
Status: Executed
- Files: `lib/payroll/engine.ts`, `app/api/v1/payroll/draft/route.ts`
- Output: draft payroll computation and persistence to payroll runs/items.

## Step 8: Statutory engine versioning
Status: Executed (deep implementation)
- Migrations:
  - `supabase/migrations/20260208172500_step8_rule_engine.sql`
  - `supabase/migrations/20260208172600_step8_seed_tz_rules.sql`
- Files: `lib/payroll/statutory.ts`, `lib/payroll/rules.ts`
- Output: rule-set tables, seeded Tanzania baseline rules, resolver-based evaluation.

## Step 9: Filing workflow controls
Status: Executed (deep implementation)
- Migration: `supabase/migrations/20260208173500_step9_filing_workflow.sql`
- Files: `app/api/v1/filings/*`
- Output: filing generation, amendments, statuses, reminders, penalties baseline.

## Step 10: Payments + future integrations
Status: Executed
- Files:
  - `app/api/v1/payments/batches/route.ts`
  - `supabase/migrations/20260208173000_step10_integrations_outbox.sql`
- Output: payment batch creation + notification outbox for future email/SMS/WhatsApp adapters.

## Step 11: Reporting + accounting foundation
Status: Executed
- Files:
  - `app/api/v1/reports/payroll-summary/route.ts`
  - `supabase/migrations/20260208173600_step11_accounting.sql`
- Output: report endpoint + GL journal line table.

## Step 12: Documents and records retention
Status: Executed
- Migrations:
  - `supabase/migrations/20260208174000_step12_documents.sql`
  - `supabase/migrations/20260208220000_step12_bik_delete_policy.sql`
- Output: document registry with retention metadata and BIK delete policy.

## Step 13: QA/UAT framework
Status: Executed (strengthened)
- Files:
  - `docs/ops/payroll-test-matrix.md`
  - `scripts/ops/check-migrations.mjs`
  - `package.json` scripts (`ci:check`, `db:check-migrations`, `test:payroll`)
  - `.github/workflows/ci.yml`
- Output: repeatable local checks + CI gate for every push/PR.

## Step 14: Operational runbook + rollout controls
Status: Executed (strengthened)
- Files:
  - `docs/ops/runbook.md`
  - `.github/workflows/ops-backup-verify.yml`
  - `.github/workflows/ops-restore-drill.yml`
  - `scripts/ops/verify-backup.mjs`
  - `scripts/ops/restore-drill.mjs`
  - `app/api/health/route.ts`
  - `app/api/v1/ops/red-dashboard/route.ts`
- Output: production runbook, scheduled backup verification, restore drill workflow, and operational red alert dashboard.

## Phase 1 (Hardening) Snapshot
Status: Executed
- Transactional RPCs implemented for:
  - employee + contract creation
  - payroll run + items creation
  - filing generation + reminders
- Idempotency key support implemented on critical POST endpoints.
- Structured API/auth error event logging implemented with internal alert outbox support.

## Phase 2 (Ops Safety) Snapshot
Status: Executed
- CI pipeline active for lint + typecheck + tests + build.
- Daily backup verification and monthly restore drill workflows added.
- Health endpoint + red dashboard alerts added for failed jobs/imports and overdue filings.

## Phase 3 (Launch QA) Snapshot
Status: Executed (operational pack prepared)
- UAT pack with 20 end-to-end scenarios:
  - `docs/ops/launch/phase3-uat-20-scenarios.md`
- 3-pilot parallel execution plan:
  - `docs/ops/launch/phase3-pilot-parallel-plan.md`
- 48-hour release freeze rule and triage constraints documented in Phase 3 assets.

## Phase 4 (Go-Live Waves) Snapshot
Status: Executed (playbook prepared)
- Wave plan for 10 -> 30 -> 60 rollout:
  - `docs/ops/launch/phase4-go-live-waves.md`
- Clear readiness and rollback gates defined for each wave.

## Phase 5 (Retention Controls) Snapshot
Status: Executed (baseline implementation)
- Weekly payroll health controls:
  - API: `app/api/v1/retention/payroll-health/route.ts`
  - Automation script: `scripts/ops/run-retention-cycle.mjs`
  - Workflow: `.github/workflows/ops-retention-cycle.yml`
- In-product reminders and SLA visibility:
  - API: `app/api/v1/compliance/deadlines/route.ts`
  - API: `app/api/v1/ops/support-sla/route.ts`
  - UI: `app/reports/page.tsx`
- Quarterly compliance reminder upsert included in retention dispatch.
