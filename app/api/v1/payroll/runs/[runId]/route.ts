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
  locked_at: string | null;
  created_at: string;
  payroll_periods: PeriodRef | PeriodRef[] | null;
};

type ItemRow = {
  id: string;
  employee_id: string;
  gross_pay: number | string;
  taxable_pay: number | string;
  total_deductions: number | string;
  net_pay: number | string;
  calc_snapshot: Record<string, unknown>;
  employees: { employee_no: string | null; first_name: string; last_name: string } | { employee_no: string | null; first_name: string; last_name: string }[] | null;
};

export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const context = await requirePermission("runPayroll", "/payroll");
    const { runId } = await params;

    const supabase = await createSupabaseServerClient();

    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .select(
        "id, run_label, status, gross_total, deduction_total, net_total, locked_at, created_at, payroll_periods(period_year, period_month)",
      )
      .eq("company_id", context.companyId)
      .eq("id", runId)
      .maybeSingle();

    if (runError) {
      return fail("Failed to load payroll run", 500, runError.message);
    }

    if (!run) {
      return fail("Payroll run not found", 404);
    }

    const { data: items, error: itemsError } = await supabase
      .from("payroll_run_items")
      .select(
        "id, employee_id, gross_pay, taxable_pay, total_deductions, net_pay, calc_snapshot, employees(employee_no, first_name, last_name)",
      )
      .eq("company_id", context.companyId)
      .eq("payroll_run_id", runId)
      .order("employee_id", { ascending: true });

    if (itemsError) {
      return fail("Failed to load payroll run items", 500, itemsError.message);
    }

    const typedRun = run as RunRow;
    const period = Array.isArray(typedRun.payroll_periods)
      ? typedRun.payroll_periods[0]
      : typedRun.payroll_periods;

    const response = {
      id: typedRun.id,
      runLabel: typedRun.run_label,
      status: typedRun.status,
      periodYear: period?.period_year ?? null,
      periodMonth: period?.period_month ?? null,
      grossTotal: Number(typedRun.gross_total),
      deductionTotal: Number(typedRun.deduction_total),
      netTotal: Number(typedRun.net_total),
      lockedAt: typedRun.locked_at,
      createdAt: typedRun.created_at,
      items: ((items ?? []) as ItemRow[]).map((item: ItemRow) => {
        const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
        return {
          id: item.id,
          employeeId: item.employee_id,
          employeeNo: employee?.employee_no ?? null,
          employeeName: employee ? `${employee.first_name} ${employee.last_name}` : item.employee_id,
          grossPay: Number(item.gross_pay),
          taxablePay: Number(item.taxable_pay),
          totalDeductions: Number(item.total_deductions),
          netPay: Number(item.net_pay),
          calcSnapshot: item.calc_snapshot ?? {},
        };
      }),
    };

    return ok(response);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
