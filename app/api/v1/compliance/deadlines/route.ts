import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";
import { ok, fail } from "@/lib/http";

type DeadlineItem = {
  source: "filing" | "reminder";
  id: string;
  title: string;
  dueDate: string;
  status: string;
  severity: "overdue" | "due_soon" | "upcoming";
};

export async function GET(request: Request) {
  try {
    const context = await requirePermission("viewReports", "/reports");
    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const horizonDays = Math.min(Math.max(Number(searchParams.get("horizonDays") ?? 21), 7), 60);

    const today = new Date();
    const todayIso = toIsoDate(today);
    const futureIso = toIsoDate(new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000));
    const pastIso = toIsoDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

    const [
      { data: filingRows, error: filingsError },
      { data: reminderRows, error: remindersError },
    ] = await Promise.all([
      supabase
        .from("filing_returns")
        .select("id, filing_type, due_date, status")
        .eq("company_id", context.companyId)
        .in("status", ["draft", "ready", "submitted"])
        .gte("due_date", pastIso)
        .lte("due_date", futureIso)
        .order("due_date", { ascending: true }),
      supabase
        .from("compliance_reminders")
        .select("id, reminder_type, due_date, status")
        .eq("company_id", context.companyId)
        .neq("status", "completed")
        .gte("due_date", pastIso)
        .lte("due_date", futureIso)
        .order("due_date", { ascending: true }),
    ]);

    if (filingsError || remindersError) {
      return fail("Failed to load compliance deadlines", 500, {
        filings: filingsError?.message,
        reminders: remindersError?.message,
      });
    }

    const filingItems: DeadlineItem[] = (filingRows ?? []).map((row) => ({
      source: "filing",
      id: row.id,
      title: `${row.filing_type} return`,
      dueDate: row.due_date,
      status: row.status,
      severity: classifySeverity(row.due_date, todayIso),
    }));

    const reminderItems: DeadlineItem[] = (reminderRows ?? []).map((row) => ({
      source: "reminder",
      id: row.id,
      title: row.reminder_type,
      dueDate: row.due_date,
      status: row.status,
      severity: classifySeverity(row.due_date, todayIso),
    }));

    const items = [...filingItems, ...reminderItems]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 50);

    return ok({
      generatedAt: new Date().toISOString(),
      horizonDays,
      counts: {
        overdue: items.filter((item) => item.severity === "overdue").length,
        dueSoon: items.filter((item) => item.severity === "due_soon").length,
        upcoming: items.filter((item) => item.severity === "upcoming").length,
      },
      items,
    });
  } catch (error) {
    return fail("Unauthorized", 401, error instanceof Error ? error.message : undefined);
  }
}

function classifySeverity(dueDateIso: string, todayIso: string): "overdue" | "due_soon" | "upcoming" {
  if (dueDateIso < todayIso) return "overdue";

  const diffDays = Math.floor((Date.parse(`${dueDateIso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
  if (diffDays <= 7) return "due_soon";
  return "upcoming";
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
