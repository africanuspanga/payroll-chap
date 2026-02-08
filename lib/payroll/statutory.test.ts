import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateHousingBik,
  calculateLoanBik,
  calculatePAYE,
  calculateVehicleBik,
  defaultPayrollRuleConfig,
  resolvePayrollRuleConfig,
} from "./statutory";

test("calculatePAYE uses progressive tax for resident primary", () => {
  const paye = calculatePAYE({
    taxablePay: 500_000,
    profile: {
      taxResidency: "resident",
      isPrimaryEmployment: true,
      isNonFullTimeDirector: false,
    },
    rules: defaultPayrollRuleConfig,
  });

  assert.equal(paye, 18_400);
});

test("calculatePAYE uses flat rates for non-resident and director profiles", () => {
  const nonResident = calculatePAYE({
    taxablePay: 1_000_000,
    profile: {
      taxResidency: "non_resident",
      isPrimaryEmployment: true,
      isNonFullTimeDirector: false,
    },
    rules: defaultPayrollRuleConfig,
  });

  const director = calculatePAYE({
    taxablePay: 1_000_000,
    profile: {
      taxResidency: "resident",
      isPrimaryEmployment: true,
      isNonFullTimeDirector: true,
    },
    rules: defaultPayrollRuleConfig,
  });

  assert.equal(nonResident, 150_000);
  assert.equal(director, 150_000);
});

test("BIK calculations produce expected taxable values", () => {
  const housing = calculateHousingBik(
    {
      marketRent: 500_000,
      employerDeductibleExpense: 300_000,
      employeeContribution: 50_000,
      referenceIncome: 2_000_000,
    },
    defaultPayrollRuleConfig,
  );

  const vehicle = calculateVehicleBik(
    {
      engineCc: 1800,
      vehicleAgeYears: 3,
      employerClaimsDeduction: true,
    },
    defaultPayrollRuleConfig,
  );

  const loan = calculateLoanBik(
    {
      principalOutstanding: 6_000_000,
      employeeInterestRate: 0.05,
    },
    defaultPayrollRuleConfig,
  );

  assert.equal(housing, 250_000);
  assert.equal(vehicle, 41_666.67);
  assert.equal(loan, 55_000);
});

test("resolvePayrollRuleConfig applies overrides from rule entries", () => {
  const config = resolvePayrollRuleConfig({
    SDL_RATE: {
      rate: 0.04,
      employee_threshold: 12,
    },
    NON_RESIDENT_PAYE_RATE: {
      rate: 0.2,
    },
  });

  assert.equal(config.sdlRate, 0.04);
  assert.equal(config.sdlEmployeeThreshold, 12);
  assert.equal(config.nonResidentPayeRate, 0.2);
});
