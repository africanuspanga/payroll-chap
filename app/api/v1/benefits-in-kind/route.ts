import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import {
  validateBenefitInput,
  type BenefitType,
  type BenefitUpsertInput,
} from "@/lib/validation/benefits-in-kind";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

type BenefitRow = {
  id: string;
  employee_id: string;
  benefit_type: BenefitType;
  effective_from: string;
  effective_to: string | null;
  amount: number | string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  employees:
    | { first_name: string; last_name: string; employee_no: string | null }
    | { first_name: string; last_name: string; employee_no: string | null }[]
    | null;
};

export async function GET() {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("employee_benefits_in_kind")
      .select(
        "id, employee_id, benefit_type, effective_from, effective_to, amount, metadata, created_at, employees(first_name,last_name,employee_no)",
      )
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return fail("Failed to load benefits in kind", 500, error.message);
    }

    const rows = ((data ?? []) as BenefitRow[]).map((row: BenefitRow) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : row.employee_id,
        employeeNo: employee?.employee_no ?? null,
        benefitType: row.benefit_type,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
        amount: row.amount === null ? null : Number(row.amount),
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    });

    return ok(rows);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission("manageEmployees", "/employees");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/benefits-in-kind";

    const body = (await request.json()) as BenefitUpsertInput;
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

    const validation = validateBenefitInput(body, "create");

    if (!validation.valid) {
      return failWithIdempotency("Invalid benefit payload", 422, validation.errors);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("employee_benefits_in_kind")
      .insert({
        company_id: context.companyId,
        employee_id: body.employeeId,
        benefit_type: body.benefitType,
        effective_from: body.effectiveFrom,
        effective_to: body.effectiveTo ?? null,
        amount: body.amount ?? null,
        metadata: body.metadata ?? {},
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return failWithIdempotency("Failed to create benefit in kind", 500, insertError?.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "bik.created",
      entityType: "employee_benefit_in_kind",
      entityId: inserted.id,
      metadata: {
        benefitType: body.benefitType,
        employeeId: body.employeeId,
      },
    });

    const responseBody = {
      data: { id: inserted.id },
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

    return ok({ id: inserted.id }, 201);
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/benefits-in-kind",
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
