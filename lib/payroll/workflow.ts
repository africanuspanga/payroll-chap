export type PayrollRunStatus = "draft" | "validated" | "approved" | "locked" | "paid";

const allowedTransitions: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  draft: ["validated"],
  validated: ["approved", "draft"],
  approved: ["locked", "validated"],
  locked: ["paid"],
  paid: [],
};

export function canTransitionPayrollRunStatus(from: PayrollRunStatus, to: PayrollRunStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertPayrollRunTransition(from: PayrollRunStatus, to: PayrollRunStatus) {
  if (!canTransitionPayrollRunStatus(from, to)) {
    throw new Error(`Invalid payroll status transition: ${from} -> ${to}`);
  }
}
