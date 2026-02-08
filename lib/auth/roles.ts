export const appRoles = ["owner", "admin", "accountant", "employee"] as const;

export type AppRole = (typeof appRoles)[number];

export type Permission =
  | "viewPayroll"
  | "runPayroll"
  | "manageEmployees"
  | "approveLeave"
  | "viewReports"
  | "manageSettings";

const rolePermissions: Record<AppRole, Permission[]> = {
  owner: ["viewPayroll", "runPayroll", "manageEmployees", "approveLeave", "viewReports", "manageSettings"],
  admin: ["viewPayroll", "runPayroll", "manageEmployees", "approveLeave", "viewReports"],
  accountant: ["viewPayroll", "runPayroll", "viewReports"],
  employee: [],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
