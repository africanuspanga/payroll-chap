import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";
import { loadActivePayrollRules } from "@/lib/payroll/rules";

type FilingRow = {
  id: string;
  filing_type: string;
  due_date: string;
  status: string;
  amount_due: number | string;
  submission_reference: string | null;
  payment_reference: string | null;
  penalty_amount: number | string;
  interest_amount: number | string;
  submitted_at: string | null;
  paid_at: string | null;
  original_filing_id: string | null;
  amended_reason: string | null;
  created_at: string;
  payroll_periods: { period_year: number; period_month: number } | { period_year: number; period_month: number }[] | null;
};

export async function GET(request: Request) {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

    const { data, error } = await supabase
      .from("filing_returns")
      .select(
        "id, filing_type, due_date, status, amount_due, submission_reference, payment_reference, penalty_amount, interest_amount, submitted_at, paid_at, original_filing_id, amended_reason, created_at, payroll_periods(period_year, period_month)",
      )
      .eq("company_id", context.companyId)
      .order("due_date", { ascending: false })
      .limit(limit);

    if (error) {
      return fail("Failed to load filings", 500, error.message);
    }

    const asOfDate = new Date().toISOString().slice(0, 10);
    const rules = await loadActivePayrollRules({
      supabase,
      companyId: context.companyId,
      asOfDate,
    });

    const rows = ((data ?? []) as FilingRow[]).map((filing) => {
      const period = Array.isArray(filing.payroll_periods)
        ? filing.payroll_periods[0]
        : filing.payroll_periods;

      const dueDate = new Date(`${filing.due_date}T00:00:00Z`);
      const today = new Date(`${asOfDate}T00:00:00Z`);
      const lateDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000));

      const status = filing.status;
      const activeForPenalty = status !== "submitted" && status !== "paid";
      const suggestedPenalty = activeForPenalty
        ? round2(Number(filing.amount_due) * rules.config.filingPenaltyDailyRate * lateDays)
        : Number(filing.penalty_amount);

      return {
        id: filing.id,
        filingType: filing.filing_type,
        periodYear: period?.period_year ?? null,
        periodMonth: period?.period_month ?? null,
        dueDate: filing.due_date,
        status,
        amountDue: Number(filing.amount_due),
        penaltyAmount: Number(filing.penalty_amount),
        interestAmount: Number(filing.interest_amount),
        suggestedPenalty,
        lateDays,
        submissionReference: filing.submission_reference,
        paymentReference: filing.payment_reference,
        submittedAt: filing.submitted_at,
        paidAt: filing.paid_at,
        originalFilingId: filing.original_filing_id,
        amendedReason: filing.amended_reason,
        createdAt: filing.created_at,
      };
    });

    return ok(rows);
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
