# Supabase Runbook

## 1) Prerequisites
- Node.js 20+
- npm 10+
- Supabase CLI installed (`brew install supabase/tap/supabase` or official install method)

## 2) Environment variables
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`)

## 3) Install dependencies
```bash
npm install
```

## 4) Link Supabase project (one time)
```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

## 5) Apply database migrations
```bash
npm run db:push
```

## 6) Generate DB TypeScript types (recommended)
```bash
npm run db:types
```

## 7) Run app locally
```bash
npm run dev
```

## 8) Local quality checks
```bash
npm run ci:check
```

## 9) API idempotency behavior
Critical POST routes support `Idempotency-Key` header and replay the original response for duplicate requests with same payload.
- Header format: `Idempotency-Key: <stable-unique-key>`
- Conflict behavior: same key + different payload returns `409`
- In-progress behavior: duplicate while first request runs returns `409`

## 10) Health and ops checks
- Health endpoint: `GET /api/health`
- Red dashboard endpoint: `GET /api/v1/ops/red-dashboard`
- Dashboard UI card: `app/dashboard/page.tsx` via `components/red-ops-alerts.tsx`
- Compliance deadlines endpoint: `GET /api/v1/compliance/deadlines`
- Support SLA endpoint: `GET /api/v1/ops/support-sla`
- Retention health preview/dispatch: `GET|POST /api/v1/retention/payroll-health`

## 11) CI pipeline (GitHub Actions)
Workflow: `.github/workflows/ci.yml`
- Runs on every push and PR
- Executes `npm ci` then `npm run ci:check`

## 12) Daily backup verification
Workflow: `.github/workflows/ops-backup-verify.yml`
- Runs daily at 03:10 UTC and on manual dispatch
- Generates a `public` schema dump and validates size + required table markers
- Stores artifacts in `artifacts/backups`

Required GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF_STAGING`
- `SUPABASE_DB_PASSWORD_STAGING`

Local/manual equivalent:
```bash
supabase login
supabase link --project-ref <STAGING_PROJECT_REF> --password <STAGING_DB_PASSWORD>
npm run ops:backup:verify
```

## 13) Restore drill (staging snapshot -> local Postgres)
Workflow: `.github/workflows/ops-restore-drill.yml`
- Runs monthly (day 1 at 04:00 UTC) and on manual dispatch
- Takes a fresh backup snapshot from staging project
- Restores into ephemeral Postgres service in CI
- Verifies required public tables are present after restore

Local/manual equivalent:
```bash
npm run ops:backup:verify
RESTORE_DB_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run ops:restore:drill
```

## 13.1) Weekly retention cycle
Workflow: `.github/workflows/ops-retention-cycle.yml`
- Runs every Monday and can be triggered manually.
- Queues weekly payroll health notifications.
- Upserts quarterly compliance reminder per active company.

Required GitHub secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Local/manual equivalent:
```bash
SUPABASE_URL=<YOUR_SUPABASE_URL> \
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY> \
npm run ops:retention:cycle
```

## 14) First go-live checklist
- Compliance doc signed: `docs/compliance/tz-v1.md`
- PAYE rate/band table validated against current TRA publication
- At least one end-to-end dry run performed with real sample data
- Filing output reviewed by accountant
- Backup verification and restore drill passed within the last 30 days
- Weekly retention cycle configured: `.github/workflows/ops-retention-cycle.yml`
