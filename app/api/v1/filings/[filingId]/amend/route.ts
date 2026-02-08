import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

export async function POST(request: Request, { params }: { params: Promise<{ filingId: string }> }) {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const { filingId } = await params;
    const supabase = await createSupabaseServerClient();
    const endpoint = `/api/v1/filings/${filingId}/amend`;

    const body = (await request.json()) as {
      amountDue?: number;
      reason?: string;
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

    if (body.amountDue === undefined || Number(body.amountDue) < 0) {
      return failWithIdempotency("amountDue is required and must be non-negative", 422);
    }

    if (!body.reason?.trim()) {
      return failWithIdempotency("reason is required for amendment", 422);
    }

    const { data: original, error: originalError } = await supabase
      .from("filing_returns")
      .select("id, payroll_period_id, filing_type, due_date, status")
      .eq("company_id", context.companyId)
      .eq("id", filingId)
      .maybeSingle();

    if (originalError) {
      return failWithIdempotency("Failed to load original filing", 500, originalError.message);
    }

    if (!original) {
      return failWithIdempotency("Original filing not found", 404);
    }

    const { data: amended, error: amendError } = await supabase
      .from("filing_returns")
      .insert({
        company_id: context.companyId,
        payroll_period_id: original.payroll_period_id,
        filing_type: original.filing_type,
        due_date: original.due_date,
        status: "ready",
        amount_due: Number(body.amountDue),
        original_filing_id: original.id,
        amended_reason: body.reason,
      })
      .select("id, status, amount_due")
      .single();

    if (amendError || !amended) {
      return failWithIdempotency("Failed to create amended filing", 500, amendError?.message);
    }

    const { error: originalUpdateError } = await supabase
      .from("filing_returns")
      .update({ status: "amended" })
      .eq("company_id", context.companyId)
      .eq("id", original.id);

    if (originalUpdateError) {
      return failWithIdempotency(
        "Amended filing created but failed to flag original",
        500,
        originalUpdateError.message,
      );
    }

    await supabase.from("filing_status_events").insert({
      company_id: context.companyId,
      filing_return_id: original.id,
      from_status: original.status,
      to_status: "amended",
      notes: body.reason,
      changed_by: context.userId,
    });

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "filing.amended",
      entityType: "filing_return",
      entityId: amended.id,
      metadata: {
        originalFilingId: original.id,
        reason: body.reason,
      },
    });

    const responseBody = {
      data: {
        amendedFilingId: amended.id,
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

    return ok(responseBody.data, 201);
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/filings/[filingId]/amend",
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
