import type { SupabaseClient } from "@supabase/supabase-js";

type PayrollRunWithPeriod = {
  id: string;
  created_at: string;
  gross_total: number | string;
  net_total: number | string;
  payroll_periods:
    | {
        period_year: number;
        period_month: number;
      }
    | {
        period_year: number;
        period_month: number;
      }[]
    | null;
};

export type RetentionSnapshot = {
  generatedAt: string;
  companyId: string;
  companyName: string;
  activeEmployees: number;
  latestPayrollRun: {
    payrollRunId: string;
    periodYear: number | null;
    periodMonth: number | null;
    grossTotal: number;
    netTotal: number;
    createdAt: string;
  } | null;
  filings: {
    dueSoonCount: number;
    overdueCount: number;
  };
  operations: {
    failedImports7d: number;
    failedNotifications7d: number;
    criticalErrors7d: number;
    pendingLeaveRequests: number;
  };
  healthScore: number;
};

export async function buildCompanyRetentionSnapshot(input: {
  supabase: SupabaseClient;
  companyId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const todayIso = toIsoDate(now);
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dueSoonIso = toIsoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const [
    { data: company, error: companyError },
    { count: activeEmployees, error: employeesError },
    { data: latestRun, error: latestRunError },
    { count: dueSoonCount, error: dueSoonError },
    { count: overdueCount, error: overdueError },
    { count: failedImports7d, error: importsError },
    { count: failedNotifications7d, error: notificationsError },
    { count: criticalErrors7d, error: errorsError },
    { count: pendingLeaveRequests, error: leaveError },
  ] = await Promise.all([
    input.supabase
      .from("companies")
      .select("id, legal_name, trade_name")
      .eq("id", input.companyId)
      .single(),
    input.supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", input.companyId).eq("is_active", true),
    input.supabase
      .from("payroll_runs")
      .select("id, created_at, gross_total, net_total, payroll_periods(period_year, period_month)")
      .eq("company_id", input.companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase
      .from("filing_returns")
      .select("id", { count: "exact", head: true })
      .eq("company_id", input.companyId)
      .in("status", ["draft", "ready", "submitted"])
      .gte("due_date", todayIso)
      .lte("due_date", dueSoonIso),
    input.supabase
      .from("filing_returns")
      .select("id", { count: "exact", head: true })
      .eq("company_id", input.companyId)
      .in("status", ["ready", "submitted"])
      .lt("due_date", todayIso),
    input.supabase
      .from("timesheet_import_batches")
      .select("id", { count: "exact", head: true })
      .eq("company_id", input.companyId)
      .in("status", ["partial", "failed"])
      .gte("created_at", weekAgoIso),
    input.supabase
      .from("notification_outbox")
      .select("id", { count: "exact", head: true })
      .eq("company_id", input.companyId)
      .eq("status", "failed")
      .gte("created_at", weekAgoIso),
    input.supabase
      .from("system_error_events")
      .select("id", { count: "exact", head: true })
      .or(`company_id.eq.${input.companyId},company_id.is.null`)
      .gte("created_at", weekAgoIso)
      .in("severity", ["error", "critical"]),
    input.supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", input.companyId)
      .eq("status", "pending"),
  ]);

  const firstError =
    companyError ??
    employeesError ??
    latestRunError ??
    dueSoonError ??
    overdueError ??
    importsError ??
    notificationsError ??
    errorsError ??
    leaveError;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const typedRun = (latestRun ?? null) as PayrollRunWithPeriod | null;
  const period = typedRun
    ? Array.isArray(typedRun.payroll_periods)
      ? typedRun.payroll_periods[0]
      : typedRun.payroll_periods
    : null;

  const companyName = (company?.trade_name as string | null) || (company?.legal_name as string) || input.companyId;

  const riskPoints =
    Number(overdueCount ?? 0) * 8 +
    Number(failedImports7d ?? 0) * 6 +
    Number(failedNotifications7d ?? 0) * 4 +
    Number(criticalErrors7d ?? 0) * 5 +
    Number(pendingLeaveRequests ?? 0);

  return {
    generatedAt: new Date().toISOString(),
    companyId: input.companyId,
    companyName,
    activeEmployees: Number(activeEmployees ?? 0),
    latestPayrollRun: typedRun
      ? {
          payrollRunId: typedRun.id,
          periodYear: period?.period_year ?? null,
          periodMonth: period?.period_month ?? null,
          grossTotal: Number(typedRun.gross_total ?? 0),
          netTotal: Number(typedRun.net_total ?? 0),
          createdAt: typedRun.created_at,
        }
      : null,
    filings: {
      dueSoonCount: Number(dueSoonCount ?? 0),
      overdueCount: Number(overdueCount ?? 0),
    },
    operations: {
      failedImports7d: Number(failedImports7d ?? 0),
      failedNotifications7d: Number(failedNotifications7d ?? 0),
      criticalErrors7d: Number(criticalErrors7d ?? 0),
      pendingLeaveRequests: Number(pendingLeaveRequests ?? 0),
    },
    healthScore: Math.max(0, 100 - Math.min(100, riskPoints)),
  } as RetentionSnapshot;
}

export function getQuarterReviewDueDate(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const quarterEndMonth = Math.ceil(month / 3) * 3;

  const quarterEnd = new Date(Date.UTC(year, quarterEndMonth, 0));
  return toIsoDate(quarterEnd);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
