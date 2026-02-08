import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequiredUserContext } from "@/lib/auth/user-context";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";

type LeaveRow = {
  id: string;
  employee_id: string;
  leave_policy_id: string;
  starts_on: string;
  ends_on: string;
  days_requested: number;
  status: string;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
  employees: { first_name: string; last_name: string; employee_no: string | null } | { first_name: string; last_name: string; employee_no: string | null }[] | null;
  leave_policies: { name: string; code: string } | { name: string; code: string }[] | null;
};

export async function GET() {
  try {
    const context = await getRequiredUserContext("/leave");
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_policy_id, starts_on, ends_on, days_requested, status, decision_note, decided_at, created_at, employees(first_name,last_name,employee_no), leave_policies(name,code)",
      )
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return fail("Failed to load leave requests", 500, error.message);
    }

    const response = ((data ?? []) as LeaveRow[]).map((row) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      const policy = Array.isArray(row.leave_policies) ? row.leave_policies[0] : row.leave_policies;

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : row.employee_id,
        employeeNo: employee?.employee_no ?? null,
        leavePolicyId: row.leave_policy_id,
        leaveType: policy?.name ?? "Unknown",
        leaveCode: policy?.code ?? "UNKNOWN",
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        daysRequested: Number(row.days_requested),
        status: row.status,
        decisionNote: row.decision_note,
        decidedAt: row.decided_at,
        createdAt: row.created_at,
      };
    });

    return ok(response);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getRequiredUserContext("/leave");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/leave-requests";

    const body = (await request.json()) as {
      employeeId?: string;
      leavePolicyId?: string;
      startsOn?: string;
      endsOn?: string;
      daysRequested?: number;
      source?: string;
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
      return fail(message, status, details);
    }

    if (!body.employeeId || !body.leavePolicyId || !body.startsOn || !body.endsOn || !body.daysRequested) {
      return failWithIdempotency("employeeId, leavePolicyId, startsOn, endsOn, daysRequested are required", 422);
    }

    if (Number.isNaN(Date.parse(body.startsOn)) || Number.isNaN(Date.parse(body.endsOn))) {
      return failWithIdempotency("startsOn and endsOn must be valid YYYY-MM-DD dates", 422);
    }

    if (body.daysRequested <= 0) {
      return failWithIdempotency("daysRequested must be greater than zero", 422);
    }

    const { data: created, error: createError } = await supabase
      .from("leave_requests")
      .insert({
        company_id: context.companyId,
        employee_id: body.employeeId,
        leave_policy_id: body.leavePolicyId,
        starts_on: body.startsOn,
        ends_on: body.endsOn,
        days_requested: body.daysRequested,
        status: "pending",
        requested_by: context.userId,
        source: body.source ?? "manual",
      })
      .select("id, status")
      .single();

    if (createError || !created) {
      return failWithIdempotency("Failed to create leave request", 500, createError?.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "leave_request.created",
      entityType: "leave_request",
      entityId: created.id,
    });

    if (idempotencyResolution.mode === "acquired") {
      await finalizeIdempotencySuccess({
        supabase,
        companyId: context.companyId,
        endpoint,
        key: idempotencyResolution.key,
        responseCode: 201,
        responseBody: {
          data: created,
        },
      });
    }

    return ok(created, 201);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
