export type EmployeeUpsertInput = {
  employeeNo?: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  phone?: string;
  hireDate?: string;
  employmentType?: string;
  taxResidency?: "resident" | "non_resident";
  isPrimaryEmployment?: boolean;
  isNonFullTimeDirector?: boolean;
  paymentMethod?: "bank" | "mobile_money";
  bankName?: string;
  bankAccountNo?: string;
  mobileMoneyProvider?: string;
  mobileMoneyNo?: string;
  department?: string;
  jobTitle?: string;
  basicSalary?: number;
  contractType?: string;
};

export function validateEmployeeInput(input: EmployeeUpsertInput, mode: "create" | "update") {
  const errors: string[] = [];

  if (mode === "create") {
    if (!input.firstName?.trim()) errors.push("firstName is required");
    if (!input.lastName?.trim()) errors.push("lastName is required");
    if (!input.hireDate) errors.push("hireDate is required");
    if (input.basicSalary === undefined || !Number.isFinite(Number(input.basicSalary)) || Number(input.basicSalary) < 0) {
      errors.push("basicSalary is required and must be a non-negative number");
    }
  }

  if (input.workEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.workEmail)) {
    errors.push("workEmail must be a valid email");
  }

  if (input.hireDate && Number.isNaN(Date.parse(input.hireDate))) {
    errors.push("hireDate must be a valid date in YYYY-MM-DD format");
  }

  if (input.paymentMethod === "bank" && input.bankAccountNo && input.bankAccountNo.length < 6) {
    errors.push("bankAccountNo looks invalid");
  }

  if (input.paymentMethod === "mobile_money" && !input.mobileMoneyNo) {
    errors.push("mobileMoneyNo is required when paymentMethod is mobile_money");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
