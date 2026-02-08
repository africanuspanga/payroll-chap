import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import { parseEmployeeCsv } from "@/lib/csv/employee-csv";
import { validateEmployeeInput, type EmployeeUpsertInput } from "@/lib/validation/employee";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

type CsvRejectedRow = {
  rowNumber: number;
  reason: string;
  employeeNo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export async function POST(request: Request) {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/employees/import";

    const body = (await request.json()) as {
      source?: string;
      csvText?: string;
      csvHasHeader?: boolean;
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

    if (!body.csvText?.trim()) {
      return failWithIdempotency("csvText is required", 422);
    }

    const csvParsed = parseEmployeeCsv({
      csvText: body.csvText,
      hasHeader: body.csvHasHeader ?? true,
    });

    if (!csvParsed.rows.length) {
      return failWithIdempotency("CSV has no importable rows", 422, csvParsed.rejectedRows);
    }

    const rejectedRows: CsvRejectedRow[] = csvParsed.rejectedRows.map((row) => ({
      rowNumber: row.rowNumber,
      reason: row.reason,
      employeeNo: null,
      firstName: null,
      lastName: null,
    }));

    const { data: existingRows, error: existingError } = await supabase
      .from("employees")
      .select("employee_no")
      .eq("company_id", context.companyId)
      .not("employee_no", "is", null);

    if (existingError) {
      return failWithIdempotency("Failed to load existing employee numbers", 500, existingError.message);
    }

    const existingEmployeeNos = new Set(
      (existingRows ?? [])
        .map((row) => row.employee_no)
        .filter((employeeNo): employeeNo is string => typeof employeeNo === "string" && employeeNo.length > 0),
    );
    const seenEmployeeNos = new Set<string>();

    let importedCount = 0;

    for (const row of csvParsed.rows) {
      const rowNumber = row.csvRowNumber ?? 0;
      const normalized = normalizeRow(row);
      const rowIssues: string[] = [];

      if (normalized.employeeNo) {
        if (seenEmployeeNos.has(normalized.employeeNo)) {
          rowIssues.push("Duplicate employeeNo inside this CSV");
        }
        if (existingEmployeeNos.has(normalized.employeeNo)) {
          rowIssues.push("employeeNo already exists");
        }
      }

      if (row.paymentMethod?.trim() && !normalizePaymentMethod(row.paymentMethod)) {
        rowIssues.push("paymentMethod must be bank or mobile_money");
      }

      if (row.taxResidency?.trim() && !normalizeTaxResidency(row.taxResidency)) {
        rowIssues.push("taxResidency must be resident or non_resident");
      }

      if (row.isPrimaryEmployment?.trim() && normalizeBoolean(row.isPrimaryEmployment) === undefined) {
        rowIssues.push("isPrimaryEmployment must be true/false");
      }

      if (row.isNonFullTimeDirector?.trim() && normalizeBoolean(row.isNonFullTimeDirector) === undefined) {
        rowIssues.push("isNonFullTimeDirector must be true/false");
      }

      const validation = validateEmployeeInput(normalized, "create");
      if (!validation.valid) {
        rowIssues.push(...validation.errors);
      }

      if (
        normalized.employmentType &&
        !["permanent", "contract", "part_time", "casual"].includes(normalized.employmentType)
      ) {
        rowIssues.push("employmentType must be one of permanent|contract|part_time|casual");
      }

      if (
        normalized.contractType &&
        !["permanent", "fixed_term", "seasonal"].includes(normalized.contractType)
      ) {
        rowIssues.push("contractType must be one of permanent|fixed_term|seasonal");
      }

      if (rowIssues.length) {
        rejectedRows.push({
          rowNumber,
          reason: rowIssues.join("; "),
          employeeNo: normalized.employeeNo ?? null,
          firstName: normalized.firstName ?? null,
          lastName: normalized.lastName ?? null,
        });
        continue;
      }

      const employeePayload = {
        company_id: context.companyId,
        employee_no: normalized.employeeNo ?? null,
        first_name: normalized.firstName?.trim(),
        last_name: normalized.lastName?.trim(),
        work_email: normalized.workEmail ?? null,
        phone: normalized.phone ?? null,
        hire_date: normalized.hireDate,
        employment_type: normalized.employmentType ?? "permanent",
        tax_residency: normalized.taxResidency ?? "resident",
        is_primary_employment: normalized.isPrimaryEmployment ?? true,
        is_non_full_time_director: normalized.isNonFullTimeDirector ?? false,
        payment_method: normalized.paymentMethod ?? "bank",
        bank_name: normalized.paymentMethod === "bank" ? normalized.bankName ?? null : null,
        bank_account_no: normalized.paymentMethod === "bank" ? normalized.bankAccountNo ?? null : null,
        mobile_money_provider:
          normalized.paymentMethod === "mobile_money" ? normalized.mobileMoneyProvider ?? null : null,
        mobile_money_no: normalized.paymentMethod === "mobile_money" ? normalized.mobileMoneyNo ?? null : null,
        metadata: {
          department: normalized.department ?? null,
          job_title: normalized.jobTitle ?? null,
          importSource: body.source ?? "csv_upload",
          csvRowNumber: rowNumber,
        },
      };

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert(employeePayload)
        .select("id")
        .single();

      if (employeeError || !employee) {
        rejectedRows.push({
          rowNumber,
          reason: `Failed to create employee: ${employeeError?.message ?? "unknown error"}`,
          employeeNo: normalized.employeeNo ?? null,
          firstName: normalized.firstName ?? null,
          lastName: normalized.lastName ?? null,
        });
        continue;
      }

      const { error: contractError } = await supabase.from("employee_contracts").insert({
        company_id: context.companyId,
        employee_id: employee.id,
        contract_type: normalized.contractType ?? "permanent",
        effective_from: normalized.hireDate,
        basic_salary: Number(normalized.basicSalary ?? 0),
        salary_frequency: "monthly",
        currency_code: "TZS",
        metadata: {
          source: "employee_bulk_import",
          csvRowNumber: rowNumber,
        },
      });

      if (contractError) {
        await supabase.from("employees").delete().eq("company_id", context.companyId).eq("id", employee.id);
        rejectedRows.push({
          rowNumber,
          reason: `Employee created but contract failed: ${contractError.message}`,
          employeeNo: normalized.employeeNo ?? null,
          firstName: normalized.firstName ?? null,
          lastName: normalized.lastName ?? null,
        });
        continue;
      }

      importedCount += 1;
      if (normalized.employeeNo) {
        seenEmployeeNos.add(normalized.employeeNo);
        existingEmployeeNos.add(normalized.employeeNo);
      }
    }

    const payloadCount = csvParsed.rows.length;
    const rejectedCount = rejectedRows.length;

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "employee.bulk_imported",
      entityType: "employee",
      entityId: context.companyId,
      metadata: {
        source: body.source ?? "csv_upload",
        payloadCount,
        importedCount,
        rejectedCount,
      },
    });

    const responseData = {
      payloadCount,
      importedCount,
      rejectedCount,
      rejectedRows,
    };

    if (idempotencyResolution.mode === "acquired") {
      await finalizeIdempotencySuccess({
        supabase,
        companyId: context.companyId,
        endpoint,
        key: idempotencyResolution.key,
        responseCode: 200,
        responseBody: {
          data: responseData,
        },
      });
    }

    return ok(responseData);
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/employees/import",
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

function normalizeRow(row: {
  employeeNo?: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  phone?: string;
  hireDate?: string;
  employmentType?: string;
  taxResidency?: string;
  isPrimaryEmployment?: string;
  isNonFullTimeDirector?: string;
  paymentMethod?: string;
  bankName?: string;
  bankAccountNo?: string;
  mobileMoneyProvider?: string;
  mobileMoneyNo?: string;
  department?: string;
  jobTitle?: string;
  basicSalary?: string;
  contractType?: string;
}): EmployeeUpsertInput {
  const paymentMethod = normalizePaymentMethod(row.paymentMethod);
  const taxResidency = normalizeTaxResidency(row.taxResidency);
  const employmentType = row.employmentType?.trim().toLowerCase();
  const contractType = row.contractType?.trim().toLowerCase();

  return {
    employeeNo: cleanText(row.employeeNo),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    workEmail: cleanText(row.workEmail),
    phone: cleanText(row.phone),
    hireDate: cleanText(row.hireDate),
    employmentType: employmentType || "permanent",
    taxResidency: taxResidency ?? "resident",
    isPrimaryEmployment: normalizeBoolean(row.isPrimaryEmployment) ?? true,
    isNonFullTimeDirector: normalizeBoolean(row.isNonFullTimeDirector) ?? false,
    paymentMethod: paymentMethod ?? "bank",
    bankName: cleanText(row.bankName),
    bankAccountNo: cleanText(row.bankAccountNo),
    mobileMoneyProvider: cleanText(row.mobileMoneyProvider),
    mobileMoneyNo: cleanText(row.mobileMoneyNo),
    department: cleanText(row.department),
    jobTitle: cleanText(row.jobTitle),
    basicSalary: toNonNegativeNumber(row.basicSalary),
    contractType: contractType || "permanent",
  };
}

function cleanText(value?: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function toNonNegativeNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return Number.NaN;
  }

  return parsed;
}

function normalizePaymentMethod(value?: string): "bank" | "mobile_money" | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["bank", "bank_transfer", "bank transfer"].includes(normalized)) {
    return "bank";
  }

  if (["mobile_money", "mobile money", "mobilemoney", "mm"].includes(normalized)) {
    return "mobile_money";
  }

  return undefined;
}

function normalizeTaxResidency(value?: string): "resident" | "non_resident" | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["resident", "res"].includes(normalized)) {
    return "resident";
  }

  if (["non_resident", "non resident", "nonresident", "nr"].includes(normalized)) {
    return "non_resident";
  }

  return undefined;
}

function normalizeBoolean(value?: string): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["true", "yes", "y", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0"].includes(normalized)) {
    return false;
  }

  return undefined;
}
