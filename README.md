# Payroll Chap (Next.js + Supabase)

Payroll + HR platform scaffold for Tanzania SMEs built with Next.js App Router and Supabase.

## Implemented Product Surfaces

- Dashboard
- Employees
- Payroll Engine
- Leave Management
- Reports
- Company Settings
- Auth routes (`/auth/sign-in`, `/auth/callback`, `/auth/sign-out`)
- API routes under `/api/v1/*`
- Supabase migrations for security, payroll domain, filings, payments, documents, integration outbox

## UX and Product Decisions Included

- Clean SME-first flows (simple forms, clear calls to action)
- Role-aware interface states (Owner, HR/Admin, Accountant, Employee)
- Multi-company selector in app shell
- Payroll workflow emphasis (draft, validate, finalize)
- Mobile and desktop responsive behavior
- Design system with custom colors, gradients, and motion

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Key Files

- `app/dashboard/page.tsx`
- `app/employees/page.tsx`
- `app/payroll/page.tsx`
- `app/leave/page.tsx`
- `app/reports/page.tsx`
- `app/settings/page.tsx`
- `components/app-shell.tsx`
- `components/role-context.tsx`
- `app/globals.css`

## Database and Compliance Setup

Use runbook:
- `docs/ops/runbook.md`
- `docs/ops/execution-plan.md`
- `docs/compliance/tz-v1.md`

Apply migrations:

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
npm run db:push
```

## Notes

- This repo now includes backend/security scaffolding and should be treated as foundation, not final statutory logic.
- PAYE and filing details must be validated against latest TRA guidance before production release.
