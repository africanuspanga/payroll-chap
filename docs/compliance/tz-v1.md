# Tanzania Payroll Compliance Specification v1

Status: Draft for legal/accounting sign-off  
Last updated: February 8, 2026

## 1) Scope
This specification defines the first production rule set for Payroll Chap's Tanzania payroll engine.

It covers:
- Skills Development Levy (SDL)
- PAYE employment income treatment
- Benefits in kind (housing, vehicle, concessional loans)
- Primary vs secondary employment withholding behavior
- Selected special treatments (non-residents and non-full-time directors)
- Employer filing and record-keeping obligations

It does not yet cover every statutory body/contribution permutation. Those will be versioned in later rule packs.

## 2) SDL Rules (VETA Act Cap. 82)
### 2.1 Chargeability
SDL is charged on total gross emoluments paid by the employer in a month.

Gross emoluments include salaries, wages, leave pay, fees, commissions, bonuses, gratuity, and allowances connected to employment.

### 2.2 Liability threshold
- Employer is liable when employing ten (10) or more employees.

### 2.3 Rate
- SDL rate: 3.5% of total monthly gross emoluments.

### 2.4 Filing and payment obligations
- Employer calculates and remits SDL to TRA.
- Payment form: ITX 300.01.E Employment Taxes Payment Credit Slip.
- Monthly return due date: on or before the 7th day of the following month.
- Half-year certificate required and must reconcile with monthly submissions.

### 2.5 Exemptions (as provided in source material)
Exempt categories include specified government/public institutions, diplomatic missions, UN entities, certain aid/technical institutions, defined religious functions, charitable organizations, registered educational institutions, local government authority, specified interns under TESA program, and qualifying farming employers.

Note captured from source material: Zanzibar exemptions apply only to the stated subset (a-d and g).

## 3) PAYE Rules (Income from Employment)
### 3.1 Inclusion base
Taxable employment income includes salaries/wages, leave pay, fees/commissions/bonuses/gratuity, reimbursements/discharges of personal expenditure, employment-condition payments, retirement-related payments, redundancy/termination payments, benefits in kind, and other prescribed amounts.

### 3.2 Exclusions (as provided)
Exclusions include listed exempt/final withholding amounts, qualified cafeteria/medical provisions, qualifying reimbursements wholly for employment duties, specified motor vehicle exclusions where no employer deduction claim exists, certain government/subvention allowances, qualifying relocation passages, and other listed items.

### 3.3 Benefits in kind quantification
#### Housing
Taxable BIK is the lower of market rent and the higher of:
- 15% of total annual employee income, and
- Employer's deductible expenditure in respect of premises.

Reduce quantified benefit by employee rent contribution.

#### Motor vehicle (annual values)
Apply based on engine size and age:
- <=1000cc: 250,000 TZS (<=5 years) or 125,000 TZS (>5 years)
- >1000cc <=2000cc: 500,000 TZS (<=5 years) or 250,000 TZS (>5 years)
- >2000cc <=3000cc: 1,000,000 TZS (<=5 years) or 500,000 TZS (>5 years)
- >3000cc: 1,500,000 TZS (<=5 years) or 750,000 TZS (>5 years)

#### Employee loan
BIK = statutory-interest equivalent minus actual interest paid.
Exception: no BIK when term <12 months and outstanding aggregate does not exceed three months basic salary in prior 12 months.

### 3.4 Secondary employment
Employee designates one primary employment. Secondary employers withhold PAYE at highest applicable individual rate (subject to Commissioner-approved relief rate if granted).

### 3.5 Special treatments captured in source material
- Non-resident employee: 15% flat withholding on gross employment income (effectively final for that employment).
- Director other than full-time service director: 15% withholding on director fees (non-final withholding).

### 3.6 Lump sums and retirement contributions
- Non-terminal lump sums are adjusted into year-of-payment treatment.
- Terminal payments (e.g. loss of office) are spread over six years or actual years of employment (per provided rule description).
- Approved retirement fund contributions reduce gross pay for PAYE subject to statutory cap logic.

## 4) Employer Records Retention
Maintain wage sheets, salary vouchers, and all payroll/tax withholding records for five years from end of relevant year(s), unless otherwise directed by Commissioner.

## 5) Data Fields Required in System v1
- Employer: legal name, TRA registration references, exemption type (if any), payroll region, jurisdiction flag (mainland/Zanzibar)
- Employee: residency, employment type, primary/secondary employment designation, director type, tax identifiers
- Earnings: taxable/non-taxable classification, effective dates
- Benefits in kind: type, valuation inputs, valuation output, effective dates
- Filing controls: return period, due date, status, submission reference, payment reference

## 6) Engine Behavior Requirements
- Effective-dated rule sets (`rule_version`) with immutable payroll calculation snapshots
- Deterministic recalculation from stored inputs
- Clear override audit trail (who, when, why)
- Separation of preview vs finalized values

## 7) Acceptance Checklist (Step 1 Exit Criteria)
- [ ] Compliance and finance reviewer sign off this document
- [ ] Rules mapped to test cases in `docs/ops/payroll-test-matrix.md`
- [ ] Exemptions matrix approved for mainland and Zanzibar treatment
- [ ] Filing due-date reminders validated in product requirements

## 8) Open Items
- Confirm latest TRA monthly PAYE band table and statutory rate references before go-live
- Confirm any updated ministerial exemption instruments under Cap. 82 section 19
- Confirm filing payload format requirements for current TRA submission channels
