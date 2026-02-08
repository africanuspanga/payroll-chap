export type BenefitType = "housing" | "vehicle" | "loan" | "other";

export type BenefitUpsertInput = {
  employeeId?: string;
  benefitType?: BenefitType;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  amount?: number | null;
  metadata?: Record<string, unknown>;
};

export function validateBenefitInput(input: BenefitUpsertInput, mode: "create" | "update") {
  const errors: string[] = [];

  if (mode === "create") {
    if (!input.employeeId) errors.push("employeeId is required");
    if (!input.benefitType) errors.push("benefitType is required");
    if (!input.effectiveFrom) errors.push("effectiveFrom is required");
  }

  if (input.effectiveFrom && Number.isNaN(Date.parse(input.effectiveFrom))) {
    errors.push("effectiveFrom must be a valid date");
  }

  if (input.effectiveTo && Number.isNaN(Date.parse(input.effectiveTo))) {
    errors.push("effectiveTo must be a valid date");
  }

  if (input.amount !== null && input.amount !== undefined && (!Number.isFinite(Number(input.amount)) || Number(input.amount) < 0)) {
    errors.push("amount must be a non-negative number");
  }

  const metadata = input.metadata ?? {};

  if (input.benefitType === "housing") {
    if (!isNonNegativeNumber(metadata.market_rent)) errors.push("housing metadata.market_rent is required");
    if (!isNonNegativeNumber(metadata.employer_deductible_expense)) {
      errors.push("housing metadata.employer_deductible_expense is required");
    }
    if (metadata.employee_contribution !== undefined && !isNonNegativeNumber(metadata.employee_contribution)) {
      errors.push("housing metadata.employee_contribution must be non-negative");
    }
  }

  if (input.benefitType === "vehicle") {
    if (!isPositiveNumber(metadata.engine_cc)) errors.push("vehicle metadata.engine_cc is required");
    if (!isNonNegativeNumber(metadata.vehicle_age_years)) {
      errors.push("vehicle metadata.vehicle_age_years is required");
    }
  }

  if (input.benefitType === "loan") {
    if (!isNonNegativeNumber(metadata.principal_outstanding)) {
      errors.push("loan metadata.principal_outstanding is required");
    }
    if (!isNonNegativeNumber(metadata.employee_interest_rate)) {
      errors.push("loan metadata.employee_interest_rate is required");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isNonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}
