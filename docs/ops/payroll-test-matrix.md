# Payroll Test Matrix (Tanzania v1)

Status: Draft  
Last updated: February 8, 2026

## Compliance test groups
- SDL threshold and rate tests
- PAYE inclusion/exclusion classification tests
- Benefits in kind valuation tests
- Primary/secondary employment withholding tests
- Special treatment tests (non-resident/director)
- Filing due-date and period controls

## Template
| Case ID | Scenario | Inputs | Expected Output | Rule Version | Pass/Fail |
|---|---|---|---|---|---|
| SDL-001 | Employer has 9 employees | headcount=9 | SDL=0 | tz_v1 |  |
| SDL-002 | Employer has 10 employees | headcount=10, gross=10000000 | SDL=350000 | tz_v1 |  |
| PAYE-001 | Standard primary employment | salary profile | expected PAYE bucket values | tz_v1 |  |
| BIK-VEH-001 | Vehicle <=1000cc <=5 years | engine=900, age=3 | annual BIK=250000 | tz_v1 |  |
