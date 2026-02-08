import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";

const allowedStatuses = ["approved", "rejected"] as const;

type TargetStatus = (typeof allowedStatuses)[number];

type LeaveRow = {
  id: string;
  status: string;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const context = await requirePermission("approveLeave", "/leave");
    const { requestId } = await params;
    const supabase = await createSupabaseServerClient();

    const body = (await request.json()) as {
      targetStatus?: TargetStatus;
      decisionNote?: string;
    };

    if (!body.targetStatus || !allowedStatuses.includes(body.targetStatus)) {
      return fail("targetStatus must be approved or rejected", 422);
    }

    const { data: leaveRequest, error: loadError } = await supabase
      .from("leave_requests")
      .select("id, status")
      .eq("company_id", context.companyId)
      .eq("id", requestId)
      .maybeSingle();

    if (loadError) {
      return fail("Failed to load leave request", 500, loadError.message);
    }

    if (!leaveRequest) {
      return fail("Leave request not found", 404);
    }

    const typedLeave = leaveRequest as LeaveRow;

    if (typedLeave.status !== "pending") {
      return fail("Only pending leave requests can be decided", 422);
    }

    const decisionAt = new Date().toISOString();

    const updatePayload = {
      status: body.targetStatus,
      decision_note: body.decisionNote ?? null,
      decided_at: decisionAt,
      approved_by: body.targetStatus === "approved" ? context.userId : null,
      rejected_by: body.targetStatus === "rejected" ? context.userId : null,
    };

    const { data: updated, error: updateError } = await supabase
      .from("leave_requests")
      .update(updatePayload)
      .eq("company_id", context.companyId)
      .eq("id", requestId)
      .select("id, status, decided_at")
      .single();

    if (updateError || !updated) {
      return fail("Failed to update leave request", 500, updateError?.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: `leave_request.${body.targetStatus}`,
      entityType: "leave_request",
      entityId: requestId,
      metadata: {
        from: typedLeave.status,
        to: body.targetStatus,
      },
    });

    return ok(updated);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
