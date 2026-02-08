import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const context = await requirePermission("viewReports", "/dashboard");
    const supabase = await createSupabaseServerClient();

    const todayIso = new Date().toISOString().slice(0, 10);
    const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: failedNotifications, error: outboxError },
      { count: failedImports, error: importsError },
      { count: overdueFilings, error: filingsError },
      { count: recentErrors, error: errorsError },
    ] = await Promise.all([
      supabase
        .from("notification_outbox")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .eq("status", "failed"),
      supabase
        .from("timesheet_import_batches")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .in("status", ["partial", "failed"]),
      supabase
        .from("filing_returns")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .in("status", ["ready", "submitted"])
        .lt("due_date", todayIso),
      supabase
        .from("system_error_events")
        .select("id", { count: "exact", head: true })
        .or(`company_id.eq.${context.companyId},company_id.is.null`)
        .gte("created_at", twentyFourHoursAgoIso)
        .in("severity", ["error", "critical"]),
    ]);

    if (outboxError || importsError || filingsError || errorsError) {
      return fail("Failed to compute operations dashboard alerts", 500, {
        outbox: outboxError?.message,
        imports: importsError?.message,
        filings: filingsError?.message,
        errors: errorsError?.message,
      });
    }

    const redFlags = [
      {
        code: "failed_notifications",
        label: "Failed notification deliveries",
        count: failedNotifications ?? 0,
      },
      {
        code: "failed_imports",
        label: "Timesheet imports needing attention",
        count: failedImports ?? 0,
      },
      {
        code: "overdue_filings",
        label: "Overdue filings (ready/submitted)",
        count: overdueFilings ?? 0,
      },
      {
        code: "recent_errors",
        label: "API/platform errors in last 24h",
        count: recentErrors ?? 0,
      },
    ];

    return ok({
      hasRedFlags: redFlags.some((flag) => flag.count > 0),
      redFlags,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
