import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();

    const now = new Date();
    const cutoffIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const todayIso = now.toISOString().slice(0, 10);

    const [
      { count: failedImportsOverSla, error: importsError },
      { count: failedNotificationsOverSla, error: notificationsError },
      { count: unresolvedCriticalErrorsOverSla, error: errorsError },
      { count: overdueFilings, error: filingsError },
    ] = await Promise.all([
      supabase
        .from("timesheet_import_batches")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .in("status", ["partial", "failed"])
        .lt("created_at", cutoffIso),
      supabase
        .from("notification_outbox")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .eq("status", "failed")
        .lt("created_at", cutoffIso),
      supabase
        .from("system_error_events")
        .select("id", { count: "exact", head: true })
        .or(`company_id.eq.${context.companyId},company_id.is.null`)
        .in("severity", ["critical", "error"])
        .lt("created_at", cutoffIso),
      supabase
        .from("filing_returns")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .in("status", ["ready", "submitted"])
        .lt("due_date", todayIso),
    ]);

    if (importsError || notificationsError || errorsError || filingsError) {
      return fail("Failed to compute support SLA status", 500, {
        imports: importsError?.message,
        notifications: notificationsError?.message,
        errors: errorsError?.message,
        filings: filingsError?.message,
      });
    }

    const breaches = [
      {
        code: "imports_over_24h",
        label: "Timesheet imports unresolved over 24h",
        count: Number(failedImportsOverSla ?? 0),
      },
      {
        code: "notifications_over_24h",
        label: "Notification failures unresolved over 24h",
        count: Number(failedNotificationsOverSla ?? 0),
      },
      {
        code: "errors_over_24h",
        label: "System errors unresolved over 24h",
        count: Number(unresolvedCriticalErrorsOverSla ?? 0),
      },
      {
        code: "overdue_filings",
        label: "Overdue filings requiring immediate action",
        count: Number(overdueFilings ?? 0),
      },
    ];

    return ok({
      generatedAt: new Date().toISOString(),
      targetHours: 24,
      hasBreaches: breaches.some((item) => item.count > 0),
      breaches,
    });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}
