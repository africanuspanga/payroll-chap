import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";

type PeriodRef = { period_year: number; period_month: number };
type RunRow = {
  id: string;
  run_label: string;
  status: string;
  gross_total: number | string;
  deduction_total: number | string;
  net_total: number | string;
  created_at: string;
  payroll_periods: PeriodRef | PeriodRef[] | null;
};

type CountRow = {
  payroll_run_id: string;
};

export async function GET(request: Request) {
  try {
    const context = await requirePermission("runPayroll", "/payroll");
    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? 12);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 12;

    const { data: runs, error: runsError } = await supabase
      .from("payroll_runs")
      .select(
        "id, run_label, status, gross_total, deduction_total, net_total, created_at, payroll_periods(period_year, period_month)",
      )
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (runsError) {
      return fail("Failed to load payroll runs", 500, runsError.message);
    }

    const runIds = ((runs ?? []) as RunRow[]).map((row: RunRow) => row.id);

    let countByRunId = new Map<string, number>();

    if (runIds.length) {
      const { data: itemRows, error: itemError } = await supabase
        .from("payroll_run_items")
        .select("payroll_run_id")
        .eq("company_id", context.companyId)
        .in("payroll_run_id", runIds);

      if (itemError) {
        return fail("Failed to load payroll run counts", 500, itemError.message);
      }

      countByRunId = (itemRows ?? []).reduce((map: Map<string, number>, row: CountRow) => {
        map.set(row.payroll_run_id, (map.get(row.payroll_run_id) ?? 0) + 1);
        return map;
      }, new Map<string, number>());
    }

    const response = ((runs ?? []) as RunRow[]).map((row: RunRow) => {
      const period = Array.isArray(row.payroll_periods) ? row.payroll_periods[0] : row.payroll_periods;
      return {
        id: row.id,
        runLabel: row.run_label,
        status: row.status,
        periodYear: period?.period_year ?? null,
        periodMonth: period?.period_month ?? null,
        grossTotal: Number(row.gross_total),
        deductionTotal: Number(row.deduction_total),
        netTotal: Number(row.net_total),
        employeeCount: countByRunId.get(row.id) ?? 0,
        createdAt: row.created_at,
      };
    });

    return ok(response);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
