import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { loadActivePayrollRules } from "@/lib/payroll/rules";
import {
  readIdempotencyKey,
  hashIdempotencyPayload,
  resolveIdempotencyRequest,
  finalizeIdempotencySuccess,
  finalizeIdempotencyFailure,
} from "@/lib/http/idempotency";
import { logApiFailure } from "@/lib/ops/error-events";

type RunItemRow = {
  calc_snapshot: {
    statutory?: {
      paye?: number;
      nssf?: number;
      sdl?: number;
    };
  };
};

export async function POST(request: Request) {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();
    const endpoint = "/api/v1/filings/generate";

    const body = (await request.json()) as { payrollRunId?: string };
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

    let payrollRunId = body.payrollRunId;

    if (!payrollRunId) {
      const { data: latestRun, error } = await supabase
        .from("payroll_runs")
        .select("id")
        .eq("company_id", context.companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !latestRun) {
        return failWithIdempotency("No payroll run found for filing generation", 404, error?.message);
      }

      payrollRunId = latestRun.id;
    }

    const { data: payrollRun, error: runError } = await supabase
      .from("payroll_runs")
      .select("id, payroll_period_id, gross_total")
      .eq("company_id", context.companyId)
      .eq("id", payrollRunId)
      .single();

    if (runError || !payrollRun) {
      return failWithIdempotency("Payroll run not found", 404, runError?.message);
    }

    const { data: period, error: periodError } = await supabase
      .from("payroll_periods")
      .select("period_year, period_month")
      .eq("company_id", context.companyId)
      .eq("id", payrollRun.payroll_period_id)
      .single();

    if (periodError || !period) {
      return failWithIdempotency("Payroll period not found", 404, periodError?.message);
    }

    const { data: runItems, error: runItemsError } = await supabase
      .from("payroll_run_items")
      .select("calc_snapshot")
      .eq("company_id", context.companyId)
      .eq("payroll_run_id", payrollRun.id);

    if (runItemsError) {
      return failWithIdempotency("Failed to load payroll run items", 500, runItemsError.message);
    }

    const nextMonthDueDate = new Date(Date.UTC(period.period_year, period.period_month, 7));
    const dueDate = nextMonthDueDate.toISOString().slice(0, 10);

    const rules = await loadActivePayrollRules({
      supabase,
      companyId: context.companyId,
      asOfDate: dueDate,
    });

    let payeTotal = 0;
    let nssfTotal = 0;
    let sdlValue: number | null = null;

    for (const item of (runItems ?? []) as RunItemRow[]) {
      const statutory = item.calc_snapshot?.statutory ?? {};
      payeTotal += Number(statutory.paye ?? 0);
      nssfTotal += Number(statutory.nssf ?? 0);
      if (sdlValue === null && statutory.sdl !== undefined) {
        sdlValue = Number(statutory.sdl);
      }
    }

    if (sdlValue === null) {
      sdlValue = Number(payrollRun.gross_total) * rules.config.sdlRate;
    }

    const baseRows = [
      {
        filing_type: "SDL",
        amount_due: round2(sdlValue),
      },
      {
        filing_type: "PAYE",
        amount_due: round2(payeTotal),
      },
    ];

    const lateDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(`${dueDate}T00:00:00Z`).getTime()) / 86_400_000),
    );

    const rows = baseRows.map((row) => {
      const penaltyAmount = round2(row.amount_due * rules.config.filingPenaltyDailyRate * lateDays);
      return {
        filing_type: row.filing_type,
        due_date: dueDate,
        status: "ready",
        amount_due: row.amount_due,
        penalty_amount: penaltyAmount,
        interest_amount: 0,
        metadata: {
          source: "auto_generated",
          payroll_run_id: payrollRun.id,
          rule_set_id: rules.ruleSetId,
          rule_version: rules.version,
          nssf_employee_total: round2(nssfTotal),
          paye_total: round2(payeTotal),
          late_days: lateDays,
        },
      };
    });

    const reminders = baseRows.map((row) => ({
      reminder_type: `${row.filing_type}_RETURN_DUE`,
      due_date: dueDate,
      status: "open",
      related_entity_type: "payroll_period",
      related_entity_id: `${period.period_year}-${String(period.period_month).padStart(2, "0")}`,
    }));

    const { data: transactionResult, error: transactionError } = await supabase.rpc(
      "tx_generate_filing_batch_with_reminders",
      {
        p_company_id: context.companyId,
        p_actor_user_id: context.userId,
        p_payroll_period_id: payrollRun.payroll_period_id,
        p_payroll_run_id: payrollRun.id,
        p_rule_set_id: rules.ruleSetId,
        p_rule_version: rules.version,
        p_filings: rows,
        p_reminders: reminders,
      },
    );

    if (transactionError) {
      const status = transactionError.message.includes("Base filings already exist") ? 409 : 500;
      return failWithIdempotency(
        status === 409
          ? "Base filings already exist for this payroll period. Use amend workflow instead."
          : "Failed to generate filing records",
        status,
        transactionError.message,
      );
    }

    const filings = ((transactionResult as { filings?: unknown[] } | null)?.filings ?? []) as unknown[];
    const responseBody = {
      data: filings,
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

    return ok(filings, 201);
  } catch (error) {
    const supabase = await createSupabaseServerClient();
    await logApiFailure({
      supabase,
      route: "/api/v1/filings/generate",
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
