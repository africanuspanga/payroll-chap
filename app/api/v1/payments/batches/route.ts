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

type RunItem = { id: string; net_pay: number | string };

export async function GET() {
  try {
    const context = await requirePermission("runPayroll", "/payroll");
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("payment_batches")
      .select("id, payroll_run_id, provider, status, total_amount, created_at")
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return fail("Failed to load payment batches", 500, error.message);
    }

    return ok(data ?? []);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission("runPayroll", "/payroll");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/payments/batches";

    const body = (await request.json()) as { payrollRunId?: string; provider?: string };
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

    if (!body.payrollRunId || !body.provider) {
      return failWithIdempotency("payrollRunId and provider are required", 422);
    }

    const { data: runItems, error: runItemsError } = await supabase
      .from("payroll_run_items")
      .select("id, net_pay")
      .eq("company_id", context.companyId)
      .eq("payroll_run_id", body.payrollRunId);

    if (runItemsError) {
      return failWithIdempotency("Failed to load payroll run items", 500, runItemsError.message);
    }

    if (!runItems?.length) {
      return failWithIdempotency("No payroll run items found", 422);
    }

    const typedRunItems = runItems as RunItem[];
    const totalAmount = typedRunItems.reduce((sum: number, item: RunItem) => sum + Number(item.net_pay), 0);

    const { data: batch, error: batchError } = await supabase
      .from("payment_batches")
      .insert({
        company_id: context.companyId,
        payroll_run_id: body.payrollRunId,
        provider: body.provider,
        status: "draft",
        total_amount: Math.round(totalAmount * 100) / 100,
        created_by: context.userId,
      })
      .select("id, total_amount")
      .single();

    if (batchError || !batch) {
      return failWithIdempotency("Failed to create payment batch", 500, batchError?.message);
    }

    const itemRows = typedRunItems.map((item: RunItem) => ({
      company_id: context.companyId,
      payment_batch_id: batch.id,
      payroll_run_item_id: item.id,
      amount: Number(item.net_pay),
    }));

    const { error: insertItemsError } = await supabase.from("payment_batch_items").insert(itemRows);

    if (insertItemsError) {
      return failWithIdempotency("Failed to create payment batch items", 500, insertItemsError.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "payment_batch.created",
      entityType: "payment_batch",
      entityId: batch.id,
      metadata: {
        payrollRunId: body.payrollRunId,
        itemCount: typedRunItems.length,
      },
    });

    const responseBody = {
      data: batch,
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

    return ok(batch, 201);
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/payments/batches",
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
