import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import { parseTimesheetCsv } from "@/lib/csv/timesheet-csv";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

type ImportRow = {
  employeeId?: string;
  employeeNo?: string;
  workDate?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  sourceRef?: string;
  csvRowNumber?: number;
};

type EmployeeRef = {
  id: string;
  employee_no: string | null;
};

type CsvRejectedRow = {
  rowNumber: number;
  reason: string;
  employeeNo?: string | null;
  employeeId?: string | null;
  workDate?: string | null;
};

export async function POST(request: Request) {
  try {
    const context = await requirePermission("manageEmployees", "/leave");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/timesheets/import";

    const body = (await request.json()) as {
      source?: string;
      rows?: ImportRow[];
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

    const csvParsed = body.csvText
      ? parseTimesheetCsv({
          csvText: body.csvText,
          hasHeader: body.csvHasHeader ?? true,
        })
      : { rows: [] as ImportRow[], rejectedRows: [] as Array<{ rowNumber: number; reason: string }> };

    const rows = [...(body.rows ?? []), ...csvParsed.rows];
    const csvRejectedRows: CsvRejectedRow[] = csvParsed.rejectedRows.map((row) => ({
      rowNumber: row.rowNumber,
      reason: row.reason,
      employeeId: null,
      employeeNo: null,
      workDate: null,
    }));

    if (!rows.length) {
      return failWithIdempotency("rows must contain at least one item", 422);
    }

    const employeeNos = rows.map((row) => row.employeeNo).filter((value): value is string => Boolean(value));

    let employeeNoMap = new Map<string, string>();
    if (employeeNos.length) {
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, employee_no")
        .eq("company_id", context.companyId)
        .in("employee_no", employeeNos);

      if (employeesError) {
        return failWithIdempotency("Failed to resolve employee numbers", 500, employeesError.message);
      }

      employeeNoMap = ((employees ?? []) as EmployeeRef[]).reduce((map, employee) => {
        if (employee.employee_no) {
          map.set(employee.employee_no, employee.id);
        }
        return map;
      }, new Map<string, string>());
    }

    const employeeIds = rows
      .map((row) => row.employeeId)
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    let validEmployeeIds = new Set<string>();
    if (employeeIds.length) {
      const { data: employeesById, error: employeesByIdError } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", context.companyId)
        .in("id", employeeIds);

      if (employeesByIdError) {
        return failWithIdempotency("Failed to validate employee ids", 500, employeesByIdError.message);
      }

      validEmployeeIds = new Set((employeesById ?? []).map((employee) => employee.id));
    }

    let importedCount = 0;
    let rejectedCount = csvParsed.rejectedRows.length;

    const validRows: Array<{
      company_id: string;
      employee_id: string;
      work_date: string;
      hours_worked: number;
      overtime_hours: number;
      late_minutes: number;
      source: string;
      source_ref: string | null;
      metadata: Record<string, unknown>;
    }> = [];

    for (const row of rows) {
      const rowEmployeeNo = row.employeeNo ?? null;
      const rowEmployeeId = row.employeeId ?? null;
      const rowWorkDate = row.workDate ?? null;
      const resolvedEmployeeId = row.employeeId ?? (row.employeeNo ? employeeNoMap.get(row.employeeNo) : undefined);
      const isCsvRow = typeof row.csvRowNumber === "number";

      if (!resolvedEmployeeId) {
        rejectedCount += 1;
        if (isCsvRow) {
          csvRejectedRows.push({
            rowNumber: row.csvRowNumber!,
            reason: "Employee not found by employeeId/employeeNo",
            employeeId: rowEmployeeId,
            employeeNo: rowEmployeeNo,
            workDate: rowWorkDate,
          });
        }
        continue;
      }

      if (row.employeeId && !validEmployeeIds.has(row.employeeId)) {
        rejectedCount += 1;
        if (isCsvRow) {
          csvRejectedRows.push({
            rowNumber: row.csvRowNumber!,
            reason: "employeeId does not belong to this company",
            employeeId: rowEmployeeId,
            employeeNo: rowEmployeeNo,
            workDate: rowWorkDate,
          });
        }
        continue;
      }

      if (!rowWorkDate || Number.isNaN(Date.parse(rowWorkDate))) {
        rejectedCount += 1;
        if (isCsvRow) {
          csvRejectedRows.push({
            rowNumber: row.csvRowNumber!,
            reason: "workDate is missing or invalid",
            employeeId: rowEmployeeId,
            employeeNo: rowEmployeeNo,
            workDate: rowWorkDate,
          });
        }
        continue;
      }

      const hoursWorked = Number(row.hoursWorked ?? 0);
      const overtimeHours = Number(row.overtimeHours ?? 0);
      const lateMinutes = Number(row.lateMinutes ?? 0);

      if (!Number.isFinite(hoursWorked) || !Number.isFinite(overtimeHours) || !Number.isFinite(lateMinutes)) {
        rejectedCount += 1;
        if (isCsvRow) {
          csvRejectedRows.push({
            rowNumber: row.csvRowNumber!,
            reason: "hoursWorked/overtimeHours/lateMinutes must be numeric",
            employeeId: rowEmployeeId,
            employeeNo: rowEmployeeNo,
            workDate: rowWorkDate,
          });
        }
        continue;
      }

      validRows.push({
        company_id: context.companyId,
        employee_id: resolvedEmployeeId,
        work_date: rowWorkDate,
        hours_worked: Math.max(0, hoursWorked),
        overtime_hours: Math.max(0, overtimeHours),
        late_minutes: Math.max(0, Math.trunc(lateMinutes)),
        source: "import",
        source_ref: row.sourceRef ?? null,
        metadata: {
          importSource: body.source ?? "manual",
        },
      });
    }

    if (validRows.length) {
      const { error: importError } = await supabase.from("timesheets").upsert(validRows, {
        onConflict: "employee_id,work_date,source",
      });

      if (importError) {
        return failWithIdempotency("Failed to import timesheets", 500, importError.message);
      }

      importedCount = validRows.length;
    }

    const { data: batch, error: batchError } = await supabase
      .from("timesheet_import_batches")
      .insert({
        company_id: context.companyId,
        source: body.source ?? "manual_upload",
        payload_count: rows.length,
        imported_count: importedCount,
        rejected_count: rejectedCount,
        status: rejectedCount > 0 ? "partial" : "completed",
        created_by: context.userId,
        notes: rejectedCount > 0 ? "Some rows were rejected due to validation" : null,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return failWithIdempotency("Timesheets imported but batch log failed", 500, batchError?.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "timesheets.imported",
      entityType: "timesheet_import_batch",
      entityId: batch.id,
      metadata: {
        payloadCount: rows.length,
        importedCount,
        rejectedCount,
        csvRejectedRows,
      },
    });

    const responseData = {
      batchId: batch.id,
      payloadCount: rows.length,
      importedCount,
      rejectedCount,
      csvRejectedRows,
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
      route: "/api/v1/timesheets/import",
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
