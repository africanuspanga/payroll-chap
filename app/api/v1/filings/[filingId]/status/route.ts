import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";

type FilingStatus = "draft" | "ready" | "submitted" | "paid" | "amended";

const allowedStatuses: FilingStatus[] = ["ready", "submitted", "paid"];

type FilingRow = {
  id: string;
  status: FilingStatus;
  amount_due: number | string;
  due_date: string;
  submitted_at: string | null;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ filingId: string }> }) {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const { filingId } = await params;
    const supabase = await createSupabaseServerClient();

    const body = (await request.json()) as {
      targetStatus?: FilingStatus;
      submissionReference?: string;
      paymentReference?: string;
      notes?: string;
    };

    if (!body.targetStatus || !allowedStatuses.includes(body.targetStatus)) {
      return fail("targetStatus must be ready, submitted, or paid", 422);
    }

    const { data: filing, error: filingError } = await supabase
      .from("filing_returns")
      .select("id, status, amount_due, due_date, submitted_at")
      .eq("company_id", context.companyId)
      .eq("id", filingId)
      .maybeSingle();

    if (filingError) {
      return fail("Failed to load filing", 500, filingError.message);
    }

    if (!filing) {
      return fail("Filing not found", 404);
    }

    const typedFiling = filing as FilingRow;

    const updatePayload: Record<string, unknown> = {
      status: body.targetStatus,
    };

    if (body.targetStatus === "submitted") {
      updatePayload.submitted_at = new Date().toISOString();
      updatePayload.submitted_by = context.userId;
      updatePayload.submission_reference = body.submissionReference ?? null;
    }

    if (body.targetStatus === "paid") {
      updatePayload.paid_at = new Date().toISOString();
      updatePayload.payment_reference = body.paymentReference ?? null;
      if (!typedFiling.submitted_at) {
        updatePayload.submitted_at = new Date().toISOString();
        updatePayload.submitted_by = context.userId;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("filing_returns")
      .update(updatePayload)
      .eq("company_id", context.companyId)
      .eq("id", filingId)
      .select("id, status, submitted_at, paid_at")
      .single();

    if (updateError || !updated) {
      return fail("Failed to update filing", 500, updateError?.message);
    }

    await supabase.from("filing_status_events").insert({
      company_id: context.companyId,
      filing_return_id: filingId,
      from_status: typedFiling.status,
      to_status: body.targetStatus,
      notes: body.notes ?? null,
      changed_by: context.userId,
    });

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "filing.status_changed",
      entityType: "filing_return",
      entityId: filingId,
      metadata: {
        from: typedFiling.status,
        to: body.targetStatus,
      },
    });

    return ok(updated);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
