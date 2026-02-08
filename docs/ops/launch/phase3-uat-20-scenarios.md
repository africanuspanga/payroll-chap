# Phase 3 Launch QA: 20 End-to-End UAT Scenarios

Date: February 8, 2026  
Goal: Validate full payroll journey using real Tanzanian SME patterns.

## Scope
Each scenario covers: employee onboarding -> timesheet/leave input -> payroll draft -> filing generation/status.

## Scenarios
| ID | Scenario | Key Data | Expected Result |
|---|---|---|---|
| UAT-01 | Resident primary employee monthly payroll | 1 employee, standard salary | PAYE progressive rates applied correctly |
| UAT-02 | SDL threshold below 10 employees | 9 active employees | SDL = 0 |
| UAT-03 | SDL threshold at 10 employees | 10 active employees | SDL = 3.5% of gross emoluments |
| UAT-04 | Non-resident employee | taxResidency=non_resident | PAYE flat 15% gross |
| UAT-05 | Secondary employment profile | isPrimaryEmployment=false | Withholding at highest applicable treatment |
| UAT-06 | Non full-time director fee payroll line | isNonFullTimeDirector=true | Director withholding treatment triggered |
| UAT-07 | Housing BIK taxable computation | housing metadata + employee contribution | Housing BIK included with proper reduction |
| UAT-08 | Vehicle BIK by engine/age | vehicle metadata (cc + age) | Vehicle BIK bracket value applied |
| UAT-09 | Loan BIK below statutory rate | principal + employee interest | Loan BIK differential applied |
| UAT-10 | Overtime from CSV timesheet import | overtime hours in CSV | Overtime pay reflected in payroll draft |
| UAT-11 | CSV import with invalid rows | malformed rows | Rejected rows shown with explicit reasons |
| UAT-12 | Approved unpaid leave impact | approved UNPAID leave days | Proration reduces gross and taxable pay |
| UAT-13 | Payroll with manual recurring earnings | allowance + bonus + arrears | Gross/taxable components split correctly |
| UAT-14 | Payroll with recurring deductions | loan + manual deductions | Net pay floor and deduction totals valid |
| UAT-15 | Filing generation from latest run | payroll run exists | SDL + PAYE filings created with due dates |
| UAT-16 | Filing amendment workflow | amend amount with reason | New amended filing + original marked amended |
| UAT-17 | Filing submission and payment status | mark submitted then paid | Status transitions logged and visible |
| UAT-18 | Idempotent employee create | same payload + same key | First request creates, second replays |
| UAT-19 | Idempotent payroll draft | same payload + same key | No duplicate payroll run created |
| UAT-20 | Retention dispatch and deadline cards | queue weekly report | Notification outbox rows + quarter reminder created |

## Pass Criteria
- 20/20 scenarios pass.
- No P0/P1 defects open.
- Any P2 defects must have workaround and owner.

## Freeze Rule (48h)
- Only bug triage, bug fixes, and hotfix verification are allowed.
- No new features, schema changes, or UX scope expansion.
- Defect board reviewed every 6 hours during business hours.
