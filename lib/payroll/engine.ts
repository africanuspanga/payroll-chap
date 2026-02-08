import {
  calculateHousingBik,
  calculateLoanBik,
  calculateNssfEmployeeDeduction,
  calculatePAYE,
  calculateSDL,
  calculateVehicleBik,
  defaultPayrollRuleConfig,
  type EmployeeTaxProfile,
  type PayrollRuleConfig,
} from "@/lib/payroll/statutory";

export type PayrollEmployeeInput = {
  employeeId: string;
  basicSalary: number;
  allowanceTotal?: number;
  overtimePay?: number;
  arrearsPay?: number;
  bonusPay?: number;
  unpaidLeaveDays?: number;
  workingDaysInPeriod?: number;
  loanRepayment?: number;
  manualDeductionTotal?: number;
  taxProfile?: Partial<EmployeeTaxProfile>;
  bik?: {
    housing?: {
      marketRent: number;
      employerDeductibleExpense: number;
      employeeContribution: number;
    };
    vehicle?: {
      engineCc: number;
      vehicleAgeYears: number;
      employerClaimsDeduction: boolean;
    };
    loan?: {
      principalOutstanding: number;
      employeeInterestRate: number;
    };
    otherTaxableValue?: number;
  };
};

export type PayrollComputationResult = {
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  statutory: {
    sdl: number;
    payeTotal: number;
    nssfTotal: number;
  };
  warnings: string[];
  items: Array<{
    employeeId: string;
    prorationFactor: number;
    proratedBasicPay: number;
    allowancePay: number;
    overtimePay: number;
    arrearsPay: number;
    bonusPay: number;
    bikHousingTaxable: number;
    bikVehicleTaxable: number;
    bikLoanTaxable: number;
    bikOtherTaxable: number;
    grossPay: number;
    taxablePay: number;
    statutoryDeductions: number;
    payeDeduction: number;
    nssfDeduction: number;
    loanDeductions: number;
    manualDeductions: number;
    totalDeductions: number;
    netPay: number;
    warnings: string[];
  }>;
};

export function computePayrollDraft(input: {
  employees: PayrollEmployeeInput[];
  rules?: PayrollRuleConfig;
}): PayrollComputationResult {
  const rules = input.rules ?? defaultPayrollRuleConfig;
  const warnings: string[] = [];

  const items = input.employees.map((employee) => {
    const itemWarnings: string[] = [];

    const workingDaysInPeriod = clampToNonNegative(employee.workingDaysInPeriod ?? 22);
    const unpaidLeaveDays = clampToNonNegative(employee.unpaidLeaveDays ?? 0);

    if (unpaidLeaveDays > workingDaysInPeriod) {
      itemWarnings.push("Unpaid leave days exceeded working days and were capped for proration.");
    }

    const prorationFactor =
      workingDaysInPeriod > 0
        ? round6(clampToRange((workingDaysInPeriod - unpaidLeaveDays) / workingDaysInPeriod, 0, 1))
        : 1;

    const proratedBasicPay = round2(clampToNonNegative(employee.basicSalary) * prorationFactor);
    const allowancePay = round2(clampToNonNegative(employee.allowanceTotal));
    const overtimePay = round2(clampToNonNegative(employee.overtimePay));
    const arrearsPay = round2(clampToNonNegative(employee.arrearsPay));
    const bonusPay = round2(clampToNonNegative(employee.bonusPay));

    const grossPay = round2(proratedBasicPay + allowancePay + overtimePay + arrearsPay + bonusPay);

    const bikHousingTaxable = employee.bik?.housing
      ? calculateHousingBik(
          {
            ...employee.bik.housing,
            referenceIncome: grossPay,
          },
          rules,
        )
      : 0;

    const bikVehicleTaxable = employee.bik?.vehicle
      ? calculateVehicleBik(
          {
            ...employee.bik.vehicle,
          },
          rules,
        )
      : 0;

    const bikLoanTaxable = employee.bik?.loan
      ? calculateLoanBik(
          {
            ...employee.bik.loan,
          },
          rules,
        )
      : 0;

    const bikOtherTaxable = round2(clampToNonNegative(employee.bik?.otherTaxableValue));

    const taxablePay = round2(grossPay + bikHousingTaxable + bikVehicleTaxable + bikLoanTaxable + bikOtherTaxable);

    const taxProfile: EmployeeTaxProfile = {
      taxResidency: employee.taxProfile?.taxResidency ?? "resident",
      isPrimaryEmployment: employee.taxProfile?.isPrimaryEmployment ?? true,
      isNonFullTimeDirector: employee.taxProfile?.isNonFullTimeDirector ?? false,
    };

    const payeDeduction = calculatePAYE({
      taxablePay,
      profile: taxProfile,
      rules,
    });

    const nssfDeduction = calculateNssfEmployeeDeduction({
      pensionablePay: proratedBasicPay,
      rules,
    });

    const statutoryDeductions = round2(payeDeduction + nssfDeduction);
    const loanDeductions = round2(clampToNonNegative(employee.loanRepayment));
    const manualDeductions = round2(clampToNonNegative(employee.manualDeductionTotal));
    const totalDeductions = round2(statutoryDeductions + loanDeductions + manualDeductions);

    const rawNetPay = round2(grossPay - totalDeductions);
    const netPay = Math.max(0, rawNetPay);

    if (rawNetPay < 0) {
      itemWarnings.push("Net pay was negative before floor-to-zero adjustment.");
    }

    if (grossPay === 0) {
      itemWarnings.push("Gross pay is zero. Check contract, earnings, leave and attendance inputs.");
    }

    if (itemWarnings.length) {
      warnings.push(`Employee ${employee.employeeId}: ${itemWarnings.join(" ")}`);
    }

    return {
      employeeId: employee.employeeId,
      prorationFactor,
      proratedBasicPay,
      allowancePay,
      overtimePay,
      arrearsPay,
      bonusPay,
      bikHousingTaxable,
      bikVehicleTaxable,
      bikLoanTaxable,
      bikOtherTaxable,
      grossPay,
      taxablePay,
      statutoryDeductions,
      payeDeduction,
      nssfDeduction,
      loanDeductions,
      manualDeductions,
      totalDeductions,
      netPay,
      warnings: itemWarnings,
    };
  });

  const grossTotal = round2(items.reduce((sum, item) => sum + item.grossPay, 0));
  const deductionTotal = round2(items.reduce((sum, item) => sum + item.totalDeductions, 0));
  const netTotal = round2(items.reduce((sum, item) => sum + item.netPay, 0));
  const payeTotal = round2(items.reduce((sum, item) => sum + item.payeDeduction, 0));
  const nssfTotal = round2(items.reduce((sum, item) => sum + item.nssfDeduction, 0));

  const sdl = calculateSDL({
    totalGrossEmoluments: grossTotal,
    employeeCount: items.length,
    rules,
  });

  return {
    grossTotal,
    deductionTotal,
    netTotal,
    statutory: {
      sdl,
      payeTotal,
      nssfTotal,
    },
    warnings,
    items,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round6(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clampToNonNegative(value: number | undefined) {
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

function clampToRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
