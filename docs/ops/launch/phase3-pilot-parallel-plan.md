# Phase 3 Pilot Parallel Plan (3 Companies)

Date: February 8, 2026

## Objective
Run 3 real pilot companies in parallel with controlled risk and daily feedback loops.

## Pilot Mix
- Pilot A: Hospitality (high overtime, shift patterns)
- Pilot B: Retail/Distribution (mixed payment methods)
- Pilot C: Professional services (allowance-heavy compensation)

## Parallel Test Window (10 days)
1. Day 1-2: Data mapping and import rehearsal (employees, contracts, opening balances)
2. Day 3-4: Live attendance/timesheet + leave capture
3. Day 5-6: Draft payroll validation with company accountant
4. Day 7-8: Filing pack generation and submission simulation
5. Day 9-10: Final signoff and rollback drill proof

## Required Daily Checkpoints
- Import rejection rate
- Payroll variance vs legacy system
- Filing output review status
- Blocking defects and ETA

## Acceptance Gates per Pilot
- Payroll variance <= 1% or explained and approved
- Filing pack accepted by designated finance reviewer
- Ops red dashboard has no unresolved critical alert > 24h
- Company owner signs go-live form

## Escalation Rules
- P0: same-day hotfix required
- P1: fix within 24h
- P2: backlog allowed if workaround exists

## Owner Roles
- Implementation Lead: onboarding + data quality
- Product/Ops Lead: bug triage + SLA control
- Company Champion: final business acceptance
