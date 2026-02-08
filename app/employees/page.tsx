"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

type EmployeeRecord = {
  id: string;
  employeeNo: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  workEmail: string | null;
  phone: string | null;
  hireDate: string;
  employmentType: string;
  taxResidency: string;
  isPrimaryEmployment: boolean;
  isNonFullTimeDirector: boolean;
  paymentMethod: string;
  department: string;
  jobTitle: string;
  basicSalary: number;
  contractType: string;
};

type BenefitType = "housing" | "vehicle" | "loan" | "other";

type BikRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string | null;
  benefitType: BenefitType;
  effectiveFrom: string;
  effectiveTo: string | null;
  amount: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type EmployeeFormState = {
  employeeNo: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phone: string;
  hireDate: string;
  employmentType: string;
  taxResidency: "resident" | "non_resident";
  isPrimaryEmployment: boolean;
  isNonFullTimeDirector: boolean;
  paymentMethod: "bank" | "mobile_money";
  bankName: string;
  bankAccountNo: string;
  mobileMoneyProvider: string;
  mobileMoneyNo: string;
  department: string;
  jobTitle: string;
  basicSalary: string;
  contractType: string;
};

type BikFormState = {
  employeeId: string;
  benefitType: BenefitType;
  effectiveFrom: string;
  effectiveTo: string;
  amount: string;
  housingMarketRent: string;
  housingEmployerExpense: string;
  housingEmployeeContribution: string;
  vehicleEngineCc: string;
  vehicleAgeYears: string;
  vehicleEmployerClaimsDeduction: boolean;
  loanPrincipalOutstanding: string;
  loanEmployeeInterestRate: string;
  otherDescription: string;
};

type EmployeeImportRejectedRow = {
  rowNumber: number;
  reason: string;
  employeeNo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

const defaultEmployeeForm: EmployeeFormState = {
  employeeNo: "",
  firstName: "",
  lastName: "",
  workEmail: "",
  phone: "",
  hireDate: new Date().toISOString().slice(0, 10),
  employmentType: "permanent",
  taxResidency: "resident",
  isPrimaryEmployment: true,
  isNonFullTimeDirector: false,
  paymentMethod: "bank",
  bankName: "",
  bankAccountNo: "",
  mobileMoneyProvider: "",
  mobileMoneyNo: "",
  department: "",
  jobTitle: "",
  basicSalary: "",
  contractType: "permanent",
};

function makeDefaultBikForm(employeeId = ""): BikFormState {
  return {
    employeeId,
    benefitType: "housing",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    amount: "",
    housingMarketRent: "",
    housingEmployerExpense: "",
    housingEmployeeContribution: "",
    vehicleEngineCc: "",
    vehicleAgeYears: "",
    vehicleEmployerClaimsDeduction: true,
    loanPrincipalOutstanding: "",
    loanEmployeeInterestRate: "",
    otherDescription: "",
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeRecord[]>([]);
  const [search, setSearch] = useState("");

  const [bikRecords, setBikRecords] = useState<BikRecord[]>([]);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(defaultEmployeeForm);
  const [bikForm, setBikForm] = useState<BikFormState>(makeDefaultBikForm());
  const [employeeCsvText, setEmployeeCsvText] = useState(
    [
      "employeeNo,firstName,lastName,workEmail,phone,hireDate,employmentType,taxResidency,paymentMethod,basicSalary,contractType,department,jobTitle",
      `KH-201,Asha,Kimaro,asha.kimaro@karatuhotels.co.tz,255712345678,${new Date().toISOString().slice(0, 10)},permanent,resident,bank,850000,permanent,Front Office,Receptionist`,
    ].join("\n"),
  );
  const [employeeCsvHasHeader, setEmployeeCsvHasHeader] = useState(true);
  const [employeeImportRejectedRows, setEmployeeImportRejectedRows] = useState<EmployeeImportRejectedRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isSavingBik, setIsSavingBik] = useState(false);
  const [isImportingEmployees, setIsImportingEmployees] = useState(false);
  const [activeBikActionId, setActiveBikActionId] = useState<string | null>(null);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingBikId, setEditingBikId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [employeesResponse, bikResponse] = await Promise.all([
        fetch("/api/v1/employees", { cache: "no-store" }),
        fetch("/api/v1/benefits-in-kind", { cache: "no-store" }),
      ]);

      const employeesPayload = (await employeesResponse.json()) as {
        data?: EmployeeRecord[];
        error?: { message?: string };
      };

      const bikPayload = (await bikResponse.json()) as {
        data?: BikRecord[];
        error?: { message?: string };
      };

      if (!employeesResponse.ok || !employeesPayload.data) {
        throw new Error(employeesPayload.error?.message ?? "Failed to load employees");
      }

      if (!bikResponse.ok || !bikPayload.data) {
        throw new Error(bikPayload.error?.message ?? "Failed to load benefits in kind");
      }

      const employeesData = employeesPayload.data;
      const bikData = bikPayload.data;

      setEmployees(employeesData);
      setBikRecords(bikData);

      setBikForm((previous) => {
        if (previous.employeeId) {
          return previous;
        }
        return makeDefaultBikForm(employeesData[0]?.id ?? "");
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employees page data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFilteredEmployees(employees);
      return;
    }

    setFilteredEmployees(
      employees.filter((employee) => {
        return (
          employee.fullName.toLowerCase().includes(term) ||
          (employee.employeeNo ?? "").toLowerCase().includes(term) ||
          (employee.jobTitle ?? "").toLowerCase().includes(term) ||
          (employee.department ?? "").toLowerCase().includes(term)
        );
      }),
    );
  }, [employees, search]);

  const isEditingEmployee = useMemo(() => Boolean(editingEmployeeId), [editingEmployeeId]);
  const isEditingBik = useMemo(() => Boolean(editingBikId), [editingBikId]);

  function resetEmployeeForm() {
    setEmployeeForm(defaultEmployeeForm);
    setEditingEmployeeId(null);
  }

  function beginEditEmployee(employee: EmployeeRecord) {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      employeeNo: employee.employeeNo ?? "",
      firstName: employee.firstName,
      lastName: employee.lastName,
      workEmail: employee.workEmail ?? "",
      phone: employee.phone ?? "",
      hireDate: employee.hireDate,
      employmentType: employee.employmentType,
      taxResidency: employee.taxResidency === "non_resident" ? "non_resident" : "resident",
      isPrimaryEmployment: employee.isPrimaryEmployment,
      isNonFullTimeDirector: employee.isNonFullTimeDirector,
      paymentMethod: employee.paymentMethod === "mobile_money" ? "mobile_money" : "bank",
      bankName: "",
      bankAccountNo: "",
      mobileMoneyProvider: "",
      mobileMoneyNo: "",
      department: employee.department ?? "",
      jobTitle: employee.jobTitle ?? "",
      basicSalary: String(employee.basicSalary),
      contractType: employee.contractType,
    });
  }

  function validateEmployeeForm() {
    const issues: string[] = [];

    if (!employeeForm.firstName.trim()) issues.push("First name is required");
    if (!employeeForm.lastName.trim()) issues.push("Last name is required");
    if (!employeeForm.hireDate.trim()) issues.push("Hire date is required");

    const salary = Number(employeeForm.basicSalary);
    if (!Number.isFinite(salary) || salary < 0) {
      issues.push("Basic salary must be a valid non-negative number");
    }

    if (employeeForm.paymentMethod === "mobile_money" && !employeeForm.mobileMoneyNo.trim()) {
      issues.push("Mobile money number is required for mobile money payouts");
    }

    return issues;
  }

  async function submitEmployeeForm() {
    setError(null);
    setMessage(null);

    const issues = validateEmployeeForm();
    if (issues.length) {
      setError(issues.join(". "));
      return;
    }

    setIsSavingEmployee(true);

    const payload = {
      employeeNo: employeeForm.employeeNo || undefined,
      firstName: employeeForm.firstName.trim(),
      lastName: employeeForm.lastName.trim(),
      workEmail: employeeForm.workEmail || undefined,
      phone: employeeForm.phone || undefined,
      hireDate: employeeForm.hireDate,
      employmentType: employeeForm.employmentType,
      taxResidency: employeeForm.taxResidency,
      isPrimaryEmployment: employeeForm.isPrimaryEmployment,
      isNonFullTimeDirector: employeeForm.isNonFullTimeDirector,
      paymentMethod: employeeForm.paymentMethod,
      bankName: employeeForm.bankName || undefined,
      bankAccountNo: employeeForm.bankAccountNo || undefined,
      mobileMoneyProvider: employeeForm.mobileMoneyProvider || undefined,
      mobileMoneyNo: employeeForm.mobileMoneyNo || undefined,
      department: employeeForm.department || undefined,
      jobTitle: employeeForm.jobTitle || undefined,
      basicSalary: Number(employeeForm.basicSalary),
      contractType: employeeForm.contractType,
    };

    try {
      const endpoint = editingEmployeeId ? `/api/v1/employees/${editingEmployeeId}` : "/api/v1/employees";
      const method = editingEmployeeId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        data?: unknown;
        error?: { message?: string; details?: string[] };
      };

      if (!response.ok) {
        const detailMessage = Array.isArray(result.error?.details)
          ? result.error?.details.join(". ")
          : result.error?.message;
        throw new Error(detailMessage ?? "Failed to save employee");
      }

      await loadData();
      resetEmployeeForm();
      setMessage(editingEmployeeId ? "Employee updated." : "Employee created.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save employee");
    } finally {
      setIsSavingEmployee(false);
    }
  }

  function resetBikForm() {
    setBikForm(makeDefaultBikForm(employees[0]?.id ?? ""));
    setEditingBikId(null);
  }

  function beginEditBik(row: BikRecord) {
    const metadata = row.metadata ?? {};

    setEditingBikId(row.id);
    setBikForm({
      employeeId: row.employeeId,
      benefitType: row.benefitType,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? "",
      amount: row.amount === null ? "" : String(row.amount),
      housingMarketRent: String(metadata.market_rent ?? ""),
      housingEmployerExpense: String(metadata.employer_deductible_expense ?? ""),
      housingEmployeeContribution: String(metadata.employee_contribution ?? ""),
      vehicleEngineCc: String(metadata.engine_cc ?? ""),
      vehicleAgeYears: String(metadata.vehicle_age_years ?? ""),
      vehicleEmployerClaimsDeduction: metadata.employer_claims_deduction === false ? false : true,
      loanPrincipalOutstanding: String(metadata.principal_outstanding ?? ""),
      loanEmployeeInterestRate: String(metadata.employee_interest_rate ?? ""),
      otherDescription: String(metadata.description ?? ""),
    });
  }

  function buildBikPayload() {
    const metadata: Record<string, unknown> = {};
    let amount: number | null = null;

    if (bikForm.benefitType === "housing") {
      metadata.market_rent = Number(bikForm.housingMarketRent || 0);
      metadata.employer_deductible_expense = Number(bikForm.housingEmployerExpense || 0);
      metadata.employee_contribution = Number(bikForm.housingEmployeeContribution || 0);
      amount = Number(bikForm.housingMarketRent || 0);
    }

    if (bikForm.benefitType === "vehicle") {
      metadata.engine_cc = Number(bikForm.vehicleEngineCc || 0);
      metadata.vehicle_age_years = Number(bikForm.vehicleAgeYears || 0);
      metadata.employer_claims_deduction = bikForm.vehicleEmployerClaimsDeduction;
      amount = null;
    }

    if (bikForm.benefitType === "loan") {
      metadata.principal_outstanding = Number(bikForm.loanPrincipalOutstanding || 0);
      metadata.employee_interest_rate = Number(bikForm.loanEmployeeInterestRate || 0);
      amount = Number(bikForm.loanPrincipalOutstanding || 0);
    }

    if (bikForm.benefitType === "other") {
      metadata.description = bikForm.otherDescription || null;
      amount = Number(bikForm.amount || 0);
    }

    return {
      employeeId: bikForm.employeeId,
      benefitType: bikForm.benefitType,
      effectiveFrom: bikForm.effectiveFrom,
      effectiveTo: bikForm.effectiveTo || null,
      amount,
      metadata,
    };
  }

  function validateBikForm() {
    const issues: string[] = [];

    if (!bikForm.employeeId) issues.push("Select employee for BIK record");
    if (!bikForm.effectiveFrom) issues.push("Effective from date is required");

    if (bikForm.benefitType === "housing") {
      if (!bikForm.housingMarketRent) issues.push("Housing market rent is required");
      if (!bikForm.housingEmployerExpense) issues.push("Housing employer expense is required");
    }

    if (bikForm.benefitType === "vehicle") {
      if (!bikForm.vehicleEngineCc) issues.push("Vehicle engine cc is required");
      if (!bikForm.vehicleAgeYears) issues.push("Vehicle age is required");
    }

    if (bikForm.benefitType === "loan") {
      if (!bikForm.loanPrincipalOutstanding) issues.push("Loan principal outstanding is required");
      if (!bikForm.loanEmployeeInterestRate) issues.push("Loan employee interest rate is required");
    }

    if (bikForm.benefitType === "other") {
      if (!bikForm.amount) issues.push("Other benefit amount is required");
    }

    return issues;
  }

  async function submitBikForm() {
    setError(null);
    setMessage(null);

    const issues = validateBikForm();
    if (issues.length) {
      setError(issues.join(". "));
      return;
    }

    setIsSavingBik(true);

    try {
      const endpoint = editingBikId ? `/api/v1/benefits-in-kind/${editingBikId}` : "/api/v1/benefits-in-kind";
      const method = editingBikId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildBikPayload()),
      });

      const result = (await response.json()) as {
        data?: unknown;
        error?: { message?: string; details?: string[] };
      };

      if (!response.ok) {
        const detailMessage = Array.isArray(result.error?.details)
          ? result.error?.details.join(". ")
          : result.error?.message;
        throw new Error(detailMessage ?? "Failed to save BIK");
      }

      await loadData();
      resetBikForm();
      setMessage(editingBikId ? "BIK record updated." : "BIK record created.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save BIK");
    } finally {
      setIsSavingBik(false);
    }
  }

  async function expireBikRecord(row: BikRecord) {
    setError(null);
    setMessage(null);
    setActiveBikActionId(row.id);

    try {
      const expiresOn = new Date().toISOString().slice(0, 10);
      const response = await fetch(`/api/v1/benefits-in-kind/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effectiveTo: expiresOn,
        }),
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: { message?: string; details?: string[] };
      };

      if (!response.ok) {
        const detailMessage = Array.isArray(payload.error?.details)
          ? payload.error?.details.join(". ")
          : payload.error?.message;
        throw new Error(detailMessage ?? "Failed to expire BIK record");
      }

      if (editingBikId === row.id) {
        resetBikForm();
      }

      await loadData();
      setMessage(`BIK record expired on ${expiresOn}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to expire BIK record");
    } finally {
      setActiveBikActionId(null);
    }
  }

  async function deleteBikRecord(row: BikRecord) {
    const isConfirmed = window.confirm(`Delete ${row.benefitType} BIK for ${row.employeeName}?`);
    if (!isConfirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    setActiveBikActionId(row.id);

    try {
      const response = await fetch(`/api/v1/benefits-in-kind/${row.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: { message?: string; details?: string[] };
      };

      if (!response.ok) {
        const detailMessage = Array.isArray(payload.error?.details)
          ? payload.error?.details.join(". ")
          : payload.error?.message;
        throw new Error(detailMessage ?? "Failed to delete BIK record");
      }

      if (editingBikId === row.id) {
        resetBikForm();
      }

      await loadData();
      setMessage("BIK record deleted.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to delete BIK record");
    } finally {
      setActiveBikActionId(null);
    }
  }

  async function importEmployeesFromCsv() {
    if (!employeeCsvText.trim()) {
      setError("Employee CSV text is empty.");
      return;
    }

    setError(null);
    setMessage(null);
    setEmployeeImportRejectedRows([]);
    setIsImportingEmployees(true);

    try {
      const response = await fetch("/api/v1/employees/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "manual_csv",
          csvText: employeeCsvText,
          csvHasHeader: employeeCsvHasHeader,
        }),
      });

      const payload = (await response.json()) as {
        data?: {
          payloadCount?: number;
          importedCount?: number;
          rejectedCount?: number;
          rejectedRows?: EmployeeImportRejectedRow[];
        };
        error?: { message?: string; details?: string[] };
      };

      if (!response.ok || !payload.data) {
        const detailMessage = Array.isArray(payload.error?.details)
          ? payload.error.details.join(". ")
          : payload.error?.message;
        throw new Error(detailMessage ?? "Failed to import employees");
      }

      const rejectedRows = payload.data.rejectedRows ?? [];
      setEmployeeImportRejectedRows(rejectedRows);
      setMessage(
        `Employee import completed. Rows: ${payload.data.payloadCount ?? 0}, Imported: ${payload.data.importedCount ?? 0}, Rejected: ${payload.data.rejectedCount ?? 0}`,
      );
      await loadData();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import employees");
    } finally {
      setIsImportingEmployees(false);
    }
  }

  async function handleEmployeeCsvFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setEmployeeCsvText(text);
      setMessage(`Loaded employee CSV file: ${file.name}`);
      setError(null);
    } catch {
      setError("Failed to read selected employee CSV file.");
    }
  }

  return (
    <AppShell
      title="Employees"
      subtitle="Onboard and maintain payroll-ready employee records with BIK management"
      action={
        <RoleGate permission="manageEmployees" fallback={<button className="pc-button ghost">Read Only</button>}>
          <button className="pc-button" onClick={resetEmployeeForm}>
            New Employee
          </button>
        </RoleGate>
      }
    >
      {error ? (
        <article className="pc-card pc-animate" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
          <p className="pc-trend" style={{ color: "#9f1239" }}>
            {error}
          </p>
        </article>
      ) : null}

      {message ? (
        <article className="pc-card pc-animate" style={{ borderColor: "#99f6e4", background: "#f0fdfa" }}>
          <p className="pc-trend" style={{ color: "#115e59" }}>
            {message}
          </p>
        </article>
      ) : null}

      <RoleGate permission="manageEmployees">
        <article className="pc-card pc-animate">
          <h3>{isEditingEmployee ? "Edit Employee" : "Onboard Employee"}</h3>
          <div className="pc-form-grid">
            <label>
              Employee No
              <input
                value={employeeForm.employeeNo}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, employeeNo: event.target.value }))
                }
              />
            </label>
            <label>
              First Name
              <input
                value={employeeForm.firstName}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, firstName: event.target.value }))
                }
              />
            </label>
            <label>
              Last Name
              <input
                value={employeeForm.lastName}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, lastName: event.target.value }))
                }
              />
            </label>
            <label>
              Work Email
              <input
                type="email"
                value={employeeForm.workEmail}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, workEmail: event.target.value }))
                }
              />
            </label>
            <label>
              Phone
              <input
                value={employeeForm.phone}
                onChange={(event) => setEmployeeForm((previous) => ({ ...previous, phone: event.target.value }))}
              />
            </label>
            <label>
              Hire Date
              <input
                type="date"
                value={employeeForm.hireDate}
                onChange={(event) => setEmployeeForm((previous) => ({ ...previous, hireDate: event.target.value }))}
              />
            </label>
            <label>
              Department
              <input
                value={employeeForm.department}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, department: event.target.value }))
                }
              />
            </label>
            <label>
              Job Title
              <input
                value={employeeForm.jobTitle}
                onChange={(event) => setEmployeeForm((previous) => ({ ...previous, jobTitle: event.target.value }))}
              />
            </label>
            <label>
              Employment Type
              <select
                value={employeeForm.employmentType}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, employmentType: event.target.value }))
                }
              >
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="part_time">Part Time</option>
                <option value="casual">Casual</option>
              </select>
            </label>
            <label>
              Contract Type
              <select
                value={employeeForm.contractType}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, contractType: event.target.value }))
                }
              >
                <option value="permanent">Permanent</option>
                <option value="fixed_term">Fixed Term</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </label>
            <label>
              Tax Residency
              <select
                value={employeeForm.taxResidency}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({
                    ...previous,
                    taxResidency: event.target.value as "resident" | "non_resident",
                  }))
                }
              >
                <option value="resident">Resident</option>
                <option value="non_resident">Non Resident</option>
              </select>
            </label>
            <label>
              Basic Salary (TZS)
              <input
                type="number"
                min={0}
                value={employeeForm.basicSalary}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, basicSalary: event.target.value }))
                }
              />
            </label>
            <label>
              Payment Method
              <select
                value={employeeForm.paymentMethod}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({
                    ...previous,
                    paymentMethod: event.target.value as "bank" | "mobile_money",
                  }))
                }
              >
                <option value="bank">Bank</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </label>
            <label>
              Bank Name
              <input
                value={employeeForm.bankName}
                disabled={employeeForm.paymentMethod !== "bank"}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, bankName: event.target.value }))
                }
              />
            </label>
            <label>
              Bank Account No
              <input
                value={employeeForm.bankAccountNo}
                disabled={employeeForm.paymentMethod !== "bank"}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, bankAccountNo: event.target.value }))
                }
              />
            </label>
            <label>
              Mobile Money Provider
              <input
                value={employeeForm.mobileMoneyProvider}
                disabled={employeeForm.paymentMethod !== "mobile_money"}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, mobileMoneyProvider: event.target.value }))
                }
              />
            </label>
            <label>
              Mobile Money No
              <input
                value={employeeForm.mobileMoneyNo}
                disabled={employeeForm.paymentMethod !== "mobile_money"}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, mobileMoneyNo: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="pc-row" style={{ marginTop: "0.9rem" }}>
            <label className="pc-muted">
              <input
                type="checkbox"
                checked={employeeForm.isPrimaryEmployment}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, isPrimaryEmployment: event.target.checked }))
                }
              />{" "}
              Primary employment
            </label>
            <label className="pc-muted">
              <input
                type="checkbox"
                checked={employeeForm.isNonFullTimeDirector}
                onChange={(event) =>
                  setEmployeeForm((previous) => ({ ...previous, isNonFullTimeDirector: event.target.checked }))
                }
              />{" "}
              Non full-time service director
            </label>
          </div>

          <div className="pc-toolbar" style={{ marginTop: "0.9rem" }}>
            <button className="pc-button" onClick={submitEmployeeForm} disabled={isSavingEmployee}>
              {isSavingEmployee ? "Saving..." : isEditingEmployee ? "Update Employee" : "Create Employee"}
            </button>
            {isEditingEmployee ? (
              <button className="pc-button ghost" onClick={resetEmployeeForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </article>
      </RoleGate>

      <article className="pc-card pc-animate">
        <div className="pc-toolbar">
          <input
            type="text"
            placeholder="Search by name, employee no, role, department"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="pc-button ghost" onClick={loadData} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="pc-table-wrap">
          <table className="pc-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Role</th>
                <th>Basic Salary</th>
                <th>Tax Profile</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      {employee.fullName}
                      {employee.employeeNo ? <span className="pc-muted"> ({employee.employeeNo})</span> : null}
                    </td>
                    <td>{employee.department || "-"}</td>
                    <td>{employee.jobTitle || "-"}</td>
                    <td>{new Intl.NumberFormat("en-TZ").format(employee.basicSalary)}</td>
                    <td>
                      <span className="pc-chip pending">
                        {employee.taxResidency === "non_resident" ? "Non Resident" : "Resident"}
                      </span>
                    </td>
                    <td>
                      <RoleGate permission="manageEmployees">
                        <button className="pc-text-btn" onClick={() => beginEditEmployee(employee)}>
                          Edit
                        </button>
                      </RoleGate>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="pc-muted">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <RoleGate permission="manageEmployees">
        <article className="pc-card pc-animate">
          <h3>Bulk Employee CSV Import</h3>
          <p className="pc-muted">
            Import many employees at once. Required columns per row: firstName,lastName,hireDate,basicSalary.
          </p>
          <p className="pc-muted">
            Supported columns: employeeNo,firstName,lastName,workEmail,phone,hireDate,employmentType,taxResidency,isPrimaryEmployment,isNonFullTimeDirector,paymentMethod,bankName,bankAccountNo,mobileMoneyProvider,mobileMoneyNo,basicSalary,contractType,department,jobTitle
          </p>

          <input type="file" accept=".csv,text/csv" onChange={handleEmployeeCsvFileSelect} />
          <label className="pc-muted" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={employeeCsvHasHeader}
              onChange={(event) => setEmployeeCsvHasHeader(event.target.checked)}
            />
            CSV has header row
          </label>
          <textarea
            rows={10}
            value={employeeCsvText}
            onChange={(event) => setEmployeeCsvText(event.target.value)}
            style={{ width: "100%", resize: "vertical", marginTop: 8 }}
          />
          <div className="pc-toolbar" style={{ marginTop: "0.9rem" }}>
            <button className="pc-button" onClick={importEmployeesFromCsv} disabled={isImportingEmployees}>
              {isImportingEmployees ? "Importing..." : "Import Employees CSV"}
            </button>
          </div>
        </article>
      </RoleGate>

      {employeeImportRejectedRows.length ? (
        <article className="pc-card pc-animate">
          <h3>Employee CSV Rejected Rows</h3>
          <div className="pc-table-wrap">
            <table className="pc-table">
              <thead>
                <tr>
                  <th>CSV Row</th>
                  <th>Employee Ref</th>
                  <th>Name</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {employeeImportRejectedRows.map((row, index) => (
                  <tr key={`${row.rowNumber}-${index}`}>
                    <td>{row.rowNumber}</td>
                    <td>{row.employeeNo ?? "-"}</td>
                    <td>{[row.firstName ?? "", row.lastName ?? ""].join(" ").trim() || "-"}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      <RoleGate permission="manageEmployees">
        <article className="pc-card pc-animate">
          <h3>{isEditingBik ? "Edit BIK Record" : "Create BIK Record"}</h3>

          <div className="pc-form-grid">
            <label>
              Employee
              <select
                value={bikForm.employeeId}
                onChange={(event) => setBikForm((previous) => ({ ...previous, employeeId: event.target.value }))}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                    {employee.employeeNo ? ` (${employee.employeeNo})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Benefit Type
              <select
                value={bikForm.benefitType}
                onChange={(event) =>
                  setBikForm((previous) => ({ ...previous, benefitType: event.target.value as BenefitType }))
                }
              >
                <option value="housing">Housing</option>
                <option value="vehicle">Vehicle</option>
                <option value="loan">Loan</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Effective From
              <input
                type="date"
                value={bikForm.effectiveFrom}
                onChange={(event) =>
                  setBikForm((previous) => ({ ...previous, effectiveFrom: event.target.value }))
                }
              />
            </label>

            <label>
              Effective To
              <input
                type="date"
                value={bikForm.effectiveTo}
                onChange={(event) => setBikForm((previous) => ({ ...previous, effectiveTo: event.target.value }))}
              />
            </label>

            {bikForm.benefitType === "housing" ? (
              <>
                <label>
                  Market Rent (TZS)
                  <input
                    type="number"
                    min={0}
                    value={bikForm.housingMarketRent}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, housingMarketRent: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Employer Deductible Expense (TZS)
                  <input
                    type="number"
                    min={0}
                    value={bikForm.housingEmployerExpense}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, housingEmployerExpense: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Employee Contribution (TZS)
                  <input
                    type="number"
                    min={0}
                    value={bikForm.housingEmployeeContribution}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, housingEmployeeContribution: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : null}

            {bikForm.benefitType === "vehicle" ? (
              <>
                <label>
                  Engine CC
                  <input
                    type="number"
                    min={1}
                    value={bikForm.vehicleEngineCc}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, vehicleEngineCc: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Vehicle Age (Years)
                  <input
                    type="number"
                    min={0}
                    value={bikForm.vehicleAgeYears}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, vehicleAgeYears: event.target.value }))
                    }
                  />
                </label>
                <label className="pc-muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={bikForm.vehicleEmployerClaimsDeduction}
                    onChange={(event) =>
                      setBikForm((previous) => ({
                        ...previous,
                        vehicleEmployerClaimsDeduction: event.target.checked,
                      }))
                    }
                  />
                  Employer claims deduction for vehicle costs
                </label>
              </>
            ) : null}

            {bikForm.benefitType === "loan" ? (
              <>
                <label>
                  Principal Outstanding (TZS)
                  <input
                    type="number"
                    min={0}
                    value={bikForm.loanPrincipalOutstanding}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, loanPrincipalOutstanding: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Employee Interest Rate (e.g. 0.12)
                  <input
                    type="number"
                    min={0}
                    step="0.0001"
                    value={bikForm.loanEmployeeInterestRate}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, loanEmployeeInterestRate: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : null}

            {bikForm.benefitType === "other" ? (
              <>
                <label>
                  Amount (TZS)
                  <input
                    type="number"
                    min={0}
                    value={bikForm.amount}
                    onChange={(event) => setBikForm((previous) => ({ ...previous, amount: event.target.value }))}
                  />
                </label>
                <label>
                  Description
                  <input
                    value={bikForm.otherDescription}
                    onChange={(event) =>
                      setBikForm((previous) => ({ ...previous, otherDescription: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : null}
          </div>

          <div className="pc-toolbar" style={{ marginTop: "0.9rem" }}>
            <button className="pc-button" onClick={submitBikForm} disabled={isSavingBik}>
              {isSavingBik ? "Saving..." : isEditingBik ? "Update BIK" : "Create BIK"}
            </button>
            {isEditingBik ? (
              <button className="pc-button ghost" onClick={resetBikForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </article>
      </RoleGate>

      <article className="pc-card pc-animate">
        <h3>Benefits In Kind Register</h3>
        <div className="pc-table-wrap">
          <table className="pc-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Effective</th>
                <th>Amount</th>
                <th>Metadata</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bikRecords.length ? (
                bikRecords.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.employeeName}
                      {row.employeeNo ? <span className="pc-muted"> ({row.employeeNo})</span> : null}
                    </td>
                    <td>
                      <span className="pc-chip pending">{row.benefitType}</span>
                    </td>
                    <td>
                      {row.effectiveFrom}
                      {row.effectiveTo ? ` to ${row.effectiveTo}` : " onward"}
                    </td>
                    <td>{row.amount === null ? "-" : new Intl.NumberFormat("en-TZ").format(row.amount)}</td>
                    <td className="pc-muted">{JSON.stringify(row.metadata)}</td>
                    <td>
                      <RoleGate permission="manageEmployees">
                        <button className="pc-text-btn" onClick={() => beginEditBik(row)}>
                          Edit
                        </button>
                        {!row.effectiveTo ? (
                          <button
                            className="pc-text-btn"
                            onClick={() => expireBikRecord(row)}
                            disabled={activeBikActionId === row.id}
                          >
                            {activeBikActionId === row.id ? "Working..." : "Expire Today"}
                          </button>
                        ) : (
                          <span className="pc-muted">Expired</span>
                        )}
                        <button
                          className="pc-text-btn"
                          onClick={() => deleteBikRecord(row)}
                          disabled={activeBikActionId === row.id}
                        >
                          {activeBikActionId === row.id ? "Working..." : "Delete"}
                        </button>
                      </RoleGate>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="pc-muted">
                    No BIK records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </AppShell>
  );
}
