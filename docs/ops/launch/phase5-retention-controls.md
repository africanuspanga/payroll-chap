# Phase 5 Retention Controls

Date: February 8, 2026

## Implemented Controls
1. Weekly payroll health dispatch
- Endpoint: `POST /api/v1/retention/payroll-health`
- Automation script: `npm run ops:retention:cycle`
- Scheduled workflow: `.github/workflows/ops-retention-cycle.yml`

2. In-product deadline reminders
- Endpoint: `GET /api/v1/compliance/deadlines`
- Surface: `app/reports/page.tsx` compliance card

3. 24h support SLA monitor
- Endpoint: `GET /api/v1/ops/support-sla`
- Surface: `app/reports/page.tsx` support SLA card

4. Quarterly compliance review
- Automatically upserts `QUARTERLY_COMPLIANCE_REVIEW` in `compliance_reminders`
- Triggered during weekly health dispatch

## Operating Rhythm
- Monday: run/verify weekly health dispatch
- Daily: monitor support SLA breaches + red dashboard
- Monthly: review overdue filings trend
- Quarterly: compliance review calls with each active company
