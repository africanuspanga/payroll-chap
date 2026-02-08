"use client";

import { useRole } from "./role-context";

type GatePermission =
  | "viewPayroll"
  | "runPayroll"
  | "manageEmployees"
  | "approveLeave"
  | "viewReports"
  | "manageSettings";

export function RoleGate({
  permission,
  children,
  fallback,
}: {
  permission: GatePermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = useRole();
  if (can(permission)) {
    return <>{children}</>;
  }
  return <>{fallback ?? null}</>;
}
