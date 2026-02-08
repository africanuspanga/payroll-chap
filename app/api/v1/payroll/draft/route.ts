import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { computePayrollDraft, type PayrollEmployeeInput } from "@/lib/payroll/engine";
import { loadActivePayrollRules } from "@/lib/payroll/rules";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

type EmployeeRow = {
  id: string;
  tax_residency: string;
  is_primary_employment: boolean;
  is_non_full_time_director: boolean;
};

type ContractRow = {
  employee_id: string;
  basic_salary: number | string;
  effective_from: string;
  effective_to: string | null;
};

type EarningTypeRow = { id: string; code: string };

type RecurringEarningRow = {
  employee_id: string;
  earning_type_id: string;
  amount: number | string;
  effective_from: string;
  effective_to: string | null;
};

type DeductionTypeRow = { id: string; code: string };

type RecurringDeductionRow = {
  employee_id: string;
  deduction_type_id: string;
  amount: number | string;
  effective_from: string;
  effective_to: string | null;
};

type TimesheetRow = {
  employee_id: string;
  overtime_hours: number | string;
};

type LeaveRequestRow = {
  employee_id: string;
  days_requested: number | string;
};

type BIkRow = {
  employee_id: string;
  benefit_type: "housing" | "vehicle" | "loan" | "other";
  amount: number | string | null;
  metadata: Record<string, unknown>;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const context = await requirePermission("runPayroll", "/payroll");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/payroll/draft";

    const body = (await request.json()) as {
      periodYear?: number;
      periodMonth?: number;
      runLabel?: string;
      employeeIds?: string[];
    };

    const idempotencyResolution = await resolveIdempotencyRequest({
      supabase,
      companyId: context.companyId,
      actorUserId: context.userId,
      endpoint,
      key: readIdempotencyKey(request),
      requestHash: hashIdempotencyPayload(body),
    });

    if (idempotencyResolution.mode === "replay") {
      return Response.json(idempotencyResolution.responseBody, { status: idempotencyResolution.responseCode });
    }

    if (idempotencyResolution.mode === "conflict") {
      return fail("Idempotency key conflict: payload differs from original request", 409);
    }

    if (idempotencyResolution.mode === "in_progress") {
      return fail("Duplicate request is currently processing", 409);
    }

    async function failWithIdempotency(message: string, status: number, details?: unknown) {
      if (idempotencyResolution.mode === "acquired") {
        await finalizeIdempotencyFailure({
          supabase,
          companyId: context.companyId,
          endpoint,
          key: idempotencyResolution.key,
          responseCode: status,
          errorBody: {
            error: {
              message,
              details,
            },
          },
        });
      }

      if (status >= 500) {
        await logApiFailure({
          supabase,
          companyId: context.companyId,
          actorUserId: context.userId,
          route: endpoint,
          method: "POST",
          category: "api_failure",
          statusCode: status,
          message,
          details,
        });
      }

      return fail(message, status, details);
    }

    const periodYear = body.periodYear;
    const periodMonth = body.periodMonth;

    if (!periodYear || !periodMonth || periodMonth < 1 || periodMonth > 12) {
      return failWithIdempotency("periodYear and periodMonth (1-12) are required", 422);
    }

    const startsOn = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const endsOn = new Date(Date.UTC(periodYear, periodMonth, 0));
    const periodStart = startsOn.toISOString().slice(0, 10);
    const periodEnd = endsOn.toISOString().slice(0, 10);

    const activeRules = await loadActivePayrollRules({
      supabase,
      companyId: context.companyId,
      asOfDate: periodEnd,
    });

    const { data: periodRecord, error: periodError } = await supabase
      .from("payroll_periods")
      .upsert(
        {
          company_id: context.companyId,
          period_year: periodYear,
          period_month: periodMonth,
          starts_on: periodStart,
          ends_on: periodEnd,
        },
        {
          onConflict: "company_id,period_year,period_month",
          ignoreDuplicates: false,
        },
      )
      .select("id")
      .single();

    if (periodError || !periodRecord) {
      return failWithIdempotency("Failed to create payroll period", 500, periodError?.message);
    }

    const payrollPeriodId = periodRecord.id;

    let employeesQuery = supabase
      .from("employees")
      .select("id, tax_residency, is_primary_employment, is_non_full_time_director")
      .eq("company_id", context.companyId)
      .eq("is_active", true);

    if (body.employeeIds?.length) {
      employeesQuery = employeesQuery.in("id", body.employeeIds);
    }

    const { data: employees, error: employeesError } = await employeesQuery;

    if (employeesError) {
      return failWithIdempotency("Failed to load employees", 500, employeesError.message);
    }

    const typedEmployees = (employees ?? []) as EmployeeRow[];
    const employeeIds = typedEmployees.map((item: EmployeeRow) => item.id);

    if (!employeeIds.length) {
      return failWithIdempotency("No active employees found", 422);
    }

    const [
      { data: contracts, error: contractsError },
      { data: earningTypes, error: earningTypesError },
      { data: recurringEarnings, error: earningsError },
      { data: deductionTypes, error: deductionTypesError },
      { data: recurringDeductions, error: deductionsError },
      { data: timesheets, error: timesheetsError },
      { data: unpaidLeavePolicies, error: unpaidPoliciesError },
      { data: bikRows, error: bikError },
    ] = await Promise.all([
      supabase
        .from("employee_contracts")
        .select("employee_id, basic_salary, effective_from, effective_to")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds),
      supabase.from("earning_types").select("id, code").eq("company_id", context.companyId),
      supabase
        .from("employee_recurring_earnings")
        .select("employee_id, earning_type_id, amount, effective_from, effective_to")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds),
      supabase.from("deduction_types").select("id, code").eq("company_id", context.companyId),
      supabase
        .from("employee_recurring_deductions")
        .select("employee_id, deduction_type_id, amount, effective_from, effective_to")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds),
      supabase
        .from("timesheets")
        .select("employee_id, overtime_hours")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds)
        .gte("work_date", periodStart)
        .lte("work_date", periodEnd),
      supabase
        .from("leave_policies")
        .select("id")
        .eq("company_id", context.companyId)
        .eq("code", "UNPAID"),
      supabase
        .from("employee_benefits_in_kind")
        .select("employee_id, benefit_type, amount, metadata, effective_from, effective_to, created_at")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds),
    ]);

    if (
      contractsError ||
      earningTypesError ||
      earningsError ||
      deductionTypesError ||
      deductionsError ||
      timesheetsError ||
      unpaidPoliciesError ||
      bikError
    ) {
      return failWithIdempotency("Failed to load payroll inputs", 500, {
        contracts: contractsError?.message,
        earningTypes: earningTypesError?.message,
        earnings: earningsError?.message,
        deductionTypes: deductionTypesError?.message,
        deductions: deductionsError?.message,
        timesheets: timesheetsError?.message,
        unpaidPolicies: unpaidPoliciesError?.message,
        bik: bikError?.message,
      });
    }

    let unpaidLeaveRows: LeaveRequestRow[] = [];
    const unpaidPolicyIds = (unpaidLeavePolicies ?? []).map((item: { id: string }) => item.id);

    if (unpaidPolicyIds.length) {
      const { data: leaveRows, error: leaveError } = await supabase
        .from("leave_requests")
        .select("employee_id, days_requested")
        .eq("company_id", context.companyId)
        .in("employee_id", employeeIds)
        .in("leave_policy_id", unpaidPolicyIds)
        .eq("status", "approved")
        .lte("starts_on", periodEnd)
        .gte("ends_on", periodStart);

      if (leaveError) {
        return failWithIdempotency("Failed to load unpaid leave requests", 500, leaveError.message);
      }

      unpaidLeaveRows = (leaveRows ?? []) as LeaveRequestRow[];
    }

    const workingDaysInPeriod = countBusinessDays(startsOn, endsOn);

    const earningCodeById = new Map(
      ((earningTypes ?? []) as EarningTypeRow[]).map((row: EarningTypeRow) => [row.id, row.code]),
    );
    const deductionCodeById = new Map(
      ((deductionTypes ?? []) as DeductionTypeRow[]).map((row: DeductionTypeRow) => [row.id, row.code]),
    );

    const overtimeByEmployee = new Map<string, number>();
    for (const row of (timesheets ?? []) as TimesheetRow[]) {
      overtimeByEmployee.set(
        row.employee_id,
        round2((overtimeByEmployee.get(row.employee_id) ?? 0) + Number(row.overtime_hours ?? 0)),
      );
    }

    const unpaidLeaveByEmployee = new Map<string, number>();
    for (const row of unpaidLeaveRows) {
      unpaidLeaveByEmployee.set(
        row.employee_id,
        round2((unpaidLeaveByEmployee.get(row.employee_id) ?? 0) + Number(row.days_requested ?? 0)),
      );
    }

    const bikByEmployee = new Map<string, BIkRow[]>();
    for (const row of (bikRows ?? []) as BIkRow[]) {
      if (!isEffectiveInPeriod(row.effective_from, row.effective_to, periodStart, periodEnd)) {
        continue;
      }
      const list = bikByEmployee.get(row.employee_id) ?? [];
      list.push(row);
      bikByEmployee.set(row.employee_id, list);
    }

    for (const list of bikByEmployee.values()) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const payrollInputs: PayrollEmployeeInput[] = typedEmployees.map((employee: EmployeeRow) => {
      const employeeId = employee.id;

      const activeContracts = ((contracts ?? []) as ContractRow[])
        .filter(
          (row: ContractRow) =>
            row.employee_id === employeeId &&
            isEffectiveInPeriod(row.effective_from, row.effective_to, periodStart, periodEnd),
        )
        .sort((a: ContractRow, b: ContractRow) => a.effective_from.localeCompare(b.effective_from));

      const latestContract = activeContracts[activeContracts.length - 1];
      const basicSalary = Number(latestContract?.basic_salary ?? 0);

      let allowanceTotal = 0;
      let bonusPay = 0;
      let arrearsPay = 0;

      for (const row of (recurringEarnings ?? []) as RecurringEarningRow[]) {
        if (row.employee_id !== employeeId) continue;
        if (!isEffectiveInPeriod(row.effective_from, row.effective_to, periodStart, periodEnd)) continue;

        const code = earningCodeById.get(row.earning_type_id) ?? "";
        const amount = Number(row.amount);

        if (code === "BONUS") {
          bonusPay += amount;
        } else if (code === "ARREARS") {
          arrearsPay += amount;
        } else {
          allowanceTotal += amount;
        }
      }

      let loanRepayment = 0;
      let manualDeductions = 0;

      for (const row of (recurringDeductions ?? []) as RecurringDeductionRow[]) {
        if (row.employee_id !== employeeId) continue;
        if (!isEffectiveInPeriod(row.effective_from, row.effective_to, periodStart, periodEnd)) continue;

        const code = deductionCodeById.get(row.deduction_type_id) ?? "";
        const amount = Number(row.amount);

        if (code === "LOAN_ADVANCE") {
          loanRepayment += amount;
        } else if (code !== "PAYE" && code !== "NSSF_EMPLOYEE") {
          manualDeductions += amount;
        }
      }

      const overtimeHours = overtimeByEmployee.get(employeeId) ?? 0;
      const hourlyRate = workingDaysInPeriod > 0 ? basicSalary / workingDaysInPeriod / 8 : 0;
      const overtimePay = round2(overtimeHours * hourlyRate * 1.5);

      const employeeBikRows = bikByEmployee.get(employeeId) ?? [];
      const housingRow = employeeBikRows.find((row) => row.benefit_type === "housing");
      const vehicleRow = employeeBikRows.find((row) => row.benefit_type === "vehicle");
      const loanRow = employeeBikRows.find((row) => row.benefit_type === "loan");

      const otherBikTotal = round2(
        employeeBikRows
          .filter((row) => row.benefit_type === "other")
          .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      );

      return {
        employeeId,
        basicSalary,
        allowanceTotal: round2(allowanceTotal),
        overtimePay,
        arrearsPay: round2(arrearsPay),
        bonusPay: round2(bonusPay),
        unpaidLeaveDays: unpaidLeaveByEmployee.get(employeeId) ?? 0,
        workingDaysInPeriod,
        loanRepayment: round2(loanRepayment),
        manualDeductionTotal: round2(manualDeductions),
        taxProfile: {
          taxResidency: employee.tax_residency === "non_resident" ? "non_resident" : "resident",
          isPrimaryEmployment: employee.is_primary_employment,
          isNonFullTimeDirector: employee.is_non_full_time_director,
        },
        bik: {
          housing: housingRow
            ? {
                marketRent: Number(housingRow.metadata?.market_rent ?? housingRow.amount ?? 0),
                employerDeductibleExpense: Number(
                  housingRow.metadata?.employer_deductible_expense ?? housingRow.amount ?? 0,
                ),
                employeeContribution: Number(housingRow.metadata?.employee_contribution ?? 0),
              }
            : undefined,
          vehicle: vehicleRow
            ? {
                engineCc: Number(vehicleRow.metadata?.engine_cc ?? 0),
                vehicleAgeYears: Number(vehicleRow.metadata?.vehicle_age_years ?? 0),
                employerClaimsDeduction:
                  vehicleRow.metadata?.employer_claims_deduction === false ? false : true,
              }
            : undefined,
          loan: loanRow
            ? {
                principalOutstanding: Number(
                  loanRow.metadata?.principal_outstanding ?? loanRow.amount ?? 0,
                ),
                employeeInterestRate: Number(loanRow.metadata?.employee_interest_rate ?? 0),
              }
            : undefined,
          otherTaxableValue: otherBikTotal,
        },
      };
    });

    const result = computePayrollDraft({
      employees: payrollInputs,
      rules: activeRules.config,
    });

    const itemRows = result.items.map((item) => ({
      employee_id: item.employeeId,
      gross_pay: item.grossPay,
      taxable_pay: item.taxablePay,
      total_deductions: item.totalDeductions,
      net_pay: item.netPay,
      calc_snapshot: {
        ruleSetId: activeRules.ruleSetId,
        ruleVersion: activeRules.version,
        prorationFactor: item.prorationFactor,
        proratedBasicPay: item.proratedBasicPay,
        allowancePay: item.allowancePay,
        overtimePay: item.overtimePay,
        arrearsPay: item.arrearsPay,
        bonusPay: item.bonusPay,
        bikHousingTaxable: item.bikHousingTaxable,
        bikVehicleTaxable: item.bikVehicleTaxable,
        bikLoanTaxable: item.bikLoanTaxable,
        bikOtherTaxable: item.bikOtherTaxable,
        statutory: {
          paye: item.payeDeduction,
          nssf: item.nssfDeduction,
          sdl: result.statutory.sdl,
        },
        warnings: item.warnings,
      },
    }));

    const { data: payrollRunId, error: runError } = await supabase.rpc("tx_create_payroll_run_with_items", {
      p_company_id: context.companyId,
      p_actor_user_id: context.userId,
      p_payroll_period_id: payrollPeriodId,
      p_run_label: body.runLabel ?? "main",
      p_gross_total: result.grossTotal,
      p_deduction_total: result.deductionTotal,
      p_net_total: result.netTotal,
      p_rule_set_id: activeRules.ruleSetId,
      p_rule_version: activeRules.version,
      p_items: itemRows,
    });

    if (runError || !payrollRunId) {
      return failWithIdempotency("Failed to create payroll run", 500, runError?.message);
    }

    const responseBody = {
      data: {
        payrollRunId: String(payrollRunId),
        ruleSetId: activeRules.ruleSetId,
        ruleVersion: activeRules.version,
        ...result,
      },
    };

    if (idempotencyResolution.mode === "acquired") {
      await finalizeIdempotencySuccess({
        supabase,
        companyId: context.companyId,
        endpoint,
        key: idempotencyResolution.key,
        responseCode: 201,
        responseBody,
      });
    }

    return ok(
      {
        payrollRunId: String(payrollRunId),
        ruleSetId: activeRules.ruleSetId,
        ruleVersion: activeRules.version,
        ...result,
      },
      201,
    );
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/payroll/draft",
      method: "POST",
      category: "auth_failure",
      statusCode: 401,
      message: error instanceof Error ? error.message : "Unauthorized",
      details: {
        phase: "require_permission_or_request_handling",
      },
    });
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

function isEffectiveInPeriod(effectiveFrom: string, effectiveTo: string | null, periodStart: string, periodEnd: string) {
  return effectiveFrom <= periodEnd && (!effectiveTo || effectiveTo >= periodStart);
}

function countBusinessDays(startsOn: Date, endsOn: Date) {
  let count = 0;
  const current = new Date(startsOn);

  while (current <= endsOn) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
