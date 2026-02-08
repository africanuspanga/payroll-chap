import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { writeAuditEvent } from "@/lib/audit";
import {
  assertPayrollRunTransition,
  type PayrollRunStatus,
} from "@/lib/payroll/workflow";

const validStatuses: PayrollRunStatus[] = ["draft", "validated", "approved", "locked", "paid"];

type RunRow = {
  id: string;
  status: PayrollRunStatus;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const context = await requirePermission("runPayroll", "/payroll");
    const { runId } = await params;
    const supabase = await createSupabaseServerClient();

    const body = (await request.json()) as {
      targetStatus?: PayrollRunStatus;
    };

    if (!body.targetStatus || !validStatuses.includes(body.targetStatus)) {
      return fail("targetStatus must be one of draft, validated, approved, locked, paid", 422);
    }

    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .select("id, status")
      .eq("company_id", context.companyId)
      .eq("id", runId)
      .maybeSingle();

    if (runError) {
      return fail("Failed to load payroll run", 500, runError.message);
    }

    if (!run) {
      return fail("Payroll run not found", 404);
    }

    const typedRun = run as RunRow;

    try {
      assertPayrollRunTransition(typedRun.status, body.targetStatus);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Invalid status transition", 422);
    }

    const updatePayload: {
      status: PayrollRunStatus;
      locked_at?: string;
      locked_by?: string;
    } = {
      status: body.targetStatus,
    };

    if (body.targetStatus === "locked") {
      updatePayload.locked_at = new Date().toISOString();
      updatePayload.locked_by = context.userId;
    }

    const { data: updatedRun, error: updateError } = await supabase
      .from("payroll_runs")
      .update(updatePayload)
      .eq("company_id", context.companyId)
      .eq("id", runId)
      .select("id, status, locked_at")
      .single();

    if (updateError || !updatedRun) {
      return fail("Failed to update payroll run status", 500, updateError?.message);
    }

    await writeAuditEvent({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "payroll_run.status_changed",
      entityType: "payroll_run",
      entityId: runId,
      metadata: {
        from: typedRun.status,
        to: body.targetStatus,
      },
    });

    return ok({
      id: updatedRun.id,
      status: updatedRun.status,
      lockedAt: updatedRun.locked_at,
    });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
