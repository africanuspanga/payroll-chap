import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";

type PayrollPeriodRef = { period_year: number; period_month: number };
type PayrollSummaryRow = {
  id: string;
  gross_total: number | string;
  deduction_total: number | string;
  net_total: number | string;
  created_at: string;
  payroll_periods: PayrollPeriodRef | PayrollPeriodRef[] | null;
};

export async function GET() {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("payroll_runs")
      .select("id, gross_total, deduction_total, net_total, created_at, payroll_period_id, payroll_periods(period_year, period_month)")
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) {
      return fail("Failed to load payroll summary", 500, error.message);
    }

    const summary = ((data ?? []) as PayrollSummaryRow[]).map((row: PayrollSummaryRow) => {
      const period = Array.isArray(row.payroll_periods) ? row.payroll_periods[0] : row.payroll_periods;
      return {
        payrollRunId: row.id,
        periodYear: period?.period_year ?? null,
        periodMonth: period?.period_month ?? null,
        grossTotal: Number(row.gross_total),
        deductionTotal: Number(row.deduction_total),
        netTotal: Number(row.net_total),
        createdAt: row.created_at,
      };
    });

    return ok(summary);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
