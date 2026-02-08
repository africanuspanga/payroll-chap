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
import { buildCompanyRetentionSnapshot, getQuarterReviewDueDate } from "@/lib/ops/retention-health";

type RecipientInput = {
  channel?: string;
  recipient?: string;
};

const allowedChannels = new Set(["internal", "email", "whatsapp"]);

export async function GET() {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();

    const snapshot = await buildCompanyRetentionSnapshot({
      supabase,
      companyId: context.companyId,
    });

    return ok({
      snapshot,
      quarterReviewDueDate: getQuarterReviewDueDate(),
    });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/retention/payroll-health";

    const body = (await request.json()) as {
      recipients?: RecipientInput[];
      notes?: string;
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

    const recipients = normalizeRecipients(body.recipients, context.companyId);
    if (!recipients.length) {
      return failWithIdempotency("At least one valid recipient is required", 422);
    }

    const snapshot = await buildCompanyRetentionSnapshot({
      supabase,
      companyId: context.companyId,
    });

    const outboxRows = recipients.map((recipient) => ({
      company_id: context.companyId,
      channel: recipient.channel,
      template_code: templateByChannel(recipient.channel),
      recipient: recipient.recipient,
      payload: {
        generatedAt: snapshot.generatedAt,
        snapshot,
        notes: body.notes?.trim() || null,
      },
      status: "queued",
      scheduled_at: new Date().toISOString(),
    }));

    const { error: outboxError } = await supabase.from("notification_outbox").insert(outboxRows);
    if (outboxError) {
      return failWithIdempotency("Failed to queue payroll health report notifications", 500, outboxError.message);
    }

    const quarterReviewDueDate = getQuarterReviewDueDate();
    const { error: reminderError } = await supabase.from("compliance_reminders").upsert(
      {
        company_id: context.companyId,
        reminder_type: "QUARTERLY_COMPLIANCE_REVIEW",
        due_date: quarterReviewDueDate,
        status: "open",
        related_entity_type: "company",
        related_entity_id: context.companyId,
      },
      {
        onConflict: "company_id,reminder_type,due_date,related_entity_type,related_entity_id",
      },
    );

    if (reminderError) {
      return failWithIdempotency("Health report queued but failed to upsert quarterly reminder", 500, reminderError.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "retention.payroll_health_report_queued",
      entityType: "notification_outbox",
      entityId: context.companyId,
      metadata: {
        queuedCount: outboxRows.length,
        channels: recipients.map((item) => item.channel),
        quarterReviewDueDate,
      },
    });

    const responseData = {
      queuedCount: outboxRows.length,
      recipients,
      quarterReviewDueDate,
      healthScore: snapshot.healthScore,
      snapshot,
    };

    if (idempotencyResolution.mode === "acquired") {
      await finalizeIdempotencySuccess({
        supabase,
        companyId: context.companyId,
        endpoint,
        key: idempotencyResolution.key,
        responseCode: 201,
        responseBody: {
          data: responseData,
        },
      });
    }

    return ok(responseData, 201);
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/retention/payroll-health",
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

function normalizeRecipients(recipients: RecipientInput[] | undefined, companyId: string) {
  const fallback = [
    { channel: "email", recipient: `company:${companyId}:owner_email` },
    { channel: "whatsapp", recipient: `company:${companyId}:owner_whatsapp` },
  ];

  const source = recipients?.length ? recipients : fallback;

  const normalized = source
    .map((item) => ({
      channel: String(item.channel ?? "").trim().toLowerCase(),
      recipient: String(item.recipient ?? "").trim(),
    }))
    .filter((item) => allowedChannels.has(item.channel) && item.recipient.length > 0);

  const deduped = new Map<string, { channel: string; recipient: string }>();
  for (const item of normalized) {
    deduped.set(`${item.channel}:${item.recipient}`, item);
  }

  return Array.from(deduped.values()).slice(0, 10);
}

function templateByChannel(channel: string) {
  if (channel === "email") return "PAYROLL_HEALTH_WEEKLY_EMAIL";
  if (channel === "whatsapp") return "PAYROLL_HEALTH_WEEKLY_WHATSAPP";
  return "PAYROLL_HEALTH_WEEKLY_INTERNAL";
}
