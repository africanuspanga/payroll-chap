import assert from "node:assert/strict";
import test from "node:test";
import { computePayrollDraft } from "./engine";

test("computePayrollDraft applies proration and floors negative net pay", () => {
  const result = computePayrollDraft({
    employees: [
      {
        employeeId: "emp-1",
        basicSalary: 2_200_000,
        allowanceTotal: 200_000,
        unpaidLeaveDays: 2,
        workingDaysInPeriod: 22,
        manualDeductionTotal: 2_000_000,
      },
    ],
  });

  assert.equal(result.items[0].prorationFactor, 0.909091);
  assert.equal(result.items[0].proratedBasicPay, 2_000_000.2);
  assert.equal(result.items[0].grossPay, 2_200_000.2);
  assert.equal(result.items[0].netPay, 0);
  assert.ok(result.items[0].warnings.length > 0);
  assert.ok(result.warnings.length > 0);
});

test("computePayrollDraft calculates PAYE/NSSF using profile rules", () => {
  const result = computePayrollDraft({
    employees: [
      {
        employeeId: "emp-1",
        basicSalary: 1_000_000,
        allowanceTotal: 100_000,
        overtimePay: 50_000,
        arrearsPay: 20_000,
        bonusPay: 80_000,
        taxProfile: {
          taxResidency: "non_resident",
          isPrimaryEmployment: true,
          isNonFullTimeDirector: false,
        },
        loanRepayment: 25_000,
        manualDeductionTotal: 10_000,
      },
      {
        employeeId: "emp-2",
        basicSalary: 900_000,
        allowanceTotal: 60_000,
        taxProfile: {
          taxResidency: "resident",
          isPrimaryEmployment: false,
          isNonFullTimeDirector: false,
        },
      },
    ],
  });

  assert.equal(result.grossTotal, 2_210_000);
  assert.equal(result.deductionTotal, 700_500);
  assert.equal(result.netTotal, 1_509_500);
  assert.equal(result.statutory.sdl, 0);
  assert.equal(result.statutory.payeTotal, 475_500);
  assert.equal(result.statutory.nssfTotal, 190_000);
});

test("computePayrollDraft computes SDL once employee threshold is met", () => {
  const employees = Array.from({ length: 10 }, (_, index) => ({
    employeeId: `emp-${index + 1}`,
    basicSalary: 1_000_000,
  }));

  const result = computePayrollDraft({ employees });
  assert.equal(result.grossTotal, 10_000_000);
  assert.equal(result.statutory.sdl, 350_000);
});
