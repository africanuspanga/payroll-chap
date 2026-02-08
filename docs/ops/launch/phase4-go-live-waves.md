# Phase 4 Go-Live Waves (Weeks 3-6)

Date: February 8, 2026

## Wave 1: 10 Companies (White-Glove)
- Full assisted onboarding and payroll shadow run.
- Daily implementation standup.
- Target metrics:
  - >= 90% successful first payroll run
  - < 5% import rejection after first correction cycle

## Wave 2: 30 Companies (Templates + Assisted Imports)
- Use standardized onboarding templates by sector.
- Assisted import + one guided payroll cycle.
- Target metrics:
  - Time-to-first-payroll <= 7 days
  - Support first-response <= 12h

## Wave 3: 60 Companies (Self-Serve + SLA Support)
- Self-serve onboarding wizard + knowledge base.
- 24h support SLA during payroll week.
- Target metrics:
  - Time-to-first-payroll <= 4 days
  - Net payroll run success >= 95%

## Wave Readiness Gates
- CI green for 7 consecutive days.
- Backup verification and restore drill passed.
- No unresolved P0/P1 defects.
- On-call support roster confirmed.

## Rollback Trigger
Pause next wave when either condition occurs:
- payroll blocking defect rate > 10% in active wave
- two or more customers blocked > 24h during payroll week
