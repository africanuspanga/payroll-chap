"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UserRole = "owner" | "admin" | "accountant" | "employee";

type Permission =
  | "viewPayroll"
  | "runPayroll"
  | "manageEmployees"
  | "approveLeave"
  | "viewReports"
  | "manageSettings";

type RoleContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  can: (permission: Permission) => boolean;
};

const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    "viewPayroll",
    "runPayroll",
    "manageEmployees",
    "approveLeave",
    "viewReports",
    "manageSettings",
  ],
  admin: [
    "viewPayroll",
    "runPayroll",
    "manageEmployees",
    "approveLeave",
    "viewReports",
  ],
  accountant: ["viewPayroll", "runPayroll", "viewReports"],
  employee: [],
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("owner");

  useEffect(() => {
    const savedRole = localStorage.getItem("payroll-chap-role") as UserRole | null;
    if (savedRole && rolePermissions[savedRole]) {
      setRoleState(savedRole);
    }
  }, []);

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
    localStorage.setItem("payroll-chap-role", nextRole);
  };

  const can = useCallback((permission: Permission) => rolePermissions[role].includes(permission), [role]);

  const value: RoleContextValue = { role, setRole, can };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}
