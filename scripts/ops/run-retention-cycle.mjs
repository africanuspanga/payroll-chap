import { createClient } from "@supabase/supabase-js";

function fail(message, details) {
  console.error(
    JSON.stringify({
      level: "error",
      category: "retention_cycle",
      message,
      details: details ?? null,
      checkedAt: new Date().toISOString(),
    }),
  );
  process.exit(1);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getQuarterReviewDueDate(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const quarterEndMonth = Math.ceil(month / 3) * 3;
  const quarterEnd = new Date(Date.UTC(year, quarterEndMonth, 0));
  return toIsoDate(quarterEnd);
}

async function countRows(query) {
  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return Number(count ?? 0);
}

async function buildSnapshot(supabase, company) {
  const now = new Date();
  const todayIso = toIsoDate(now);
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dueSoonIso = toIsoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const [{ data: latestRun, error: latestRunError }, activeEmployees, dueSoonCount, overdueCount, failedImports7d, failedNotifications7d] =
    await Promise.all([
      supabase
        .from("payroll_runs")
        .select("id, created_at, gross_total, net_total, payroll_periods(period_year, period_month)")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      countRows(supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("is_active", true)),
      countRows(
        supabase
          .from("filing_returns")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .in("status", ["draft", "ready", "submitted"])
          .gte("due_date", todayIso)
          .lte("due_date", dueSoonIso),
      ),
      countRows(
        supabase
          .from("filing_returns")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .in("status", ["ready", "submitted"])
          .lt("due_date", todayIso),
      ),
      countRows(
        supabase
          .from("timesheet_import_batches")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .in("status", ["partial", "failed"])
          .gte("created_at", weekAgoIso),
      ),
      countRows(
        supabase
          .from("notification_outbox")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .eq("status", "failed")
          .gte("created_at", weekAgoIso),
      ),
    ]);

  if (latestRunError) {
    throw new Error(latestRunError.message);
  }

  const period = latestRun
    ? Array.isArray(latestRun.payroll_periods)
      ? latestRun.payroll_periods[0]
      : latestRun.payroll_periods
    : null;

  const riskPoints = overdueCount * 8 + failedImports7d * 6 + failedNotifications7d * 4;

  return {
    generatedAt: new Date().toISOString(),
    companyId: company.id,
    companyName: company.trade_name || company.legal_name || company.id,
    activeEmployees,
    latestPayrollRun: latestRun
      ? {
          payrollRunId: latestRun.id,
          periodYear: period?.period_year ?? null,
          periodMonth: period?.period_month ?? null,
          grossTotal: Number(latestRun.gross_total ?? 0),
          netTotal: Number(latestRun.net_total ?? 0),
          createdAt: latestRun.created_at,
        }
      : null,
    filings: {
      dueSoonCount,
      overdueCount,
    },
    operations: {
      failedImports7d,
      failedNotifications7d,
    },
    healthScore: Math.max(0, 100 - Math.min(100, riskPoints)),
  };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previewOnly = process.env.RETENTION_PREVIEW_ONLY === "true";

  if (!supabaseUrl || !serviceRoleKey) {
    fail("Missing required env for retention cycle", {
      required: ["SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(5000);

  if (companiesError) {
    fail("Failed to load companies", companiesError.message);
  }

  const quarterReviewDueDate = getQuarterReviewDueDate();
  const processed = [];

  for (const company of companies ?? []) {
    try {
      const snapshot = await buildSnapshot(supabase, company);

      const outboxRows = [
        {
          company_id: company.id,
          channel: "email",
          template_code: "PAYROLL_HEALTH_WEEKLY_EMAIL",
          recipient: `company:${company.id}:owner_email`,
          payload: { snapshot },
          status: "queued",
          scheduled_at: new Date().toISOString(),
        },
        {
          company_id: company.id,
          channel: "whatsapp",
          template_code: "PAYROLL_HEALTH_WEEKLY_WHATSAPP",
          recipient: `company:${company.id}:owner_whatsapp`,
          payload: { snapshot },
          status: "queued",
          scheduled_at: new Date().toISOString(),
        },
      ];

      if (!previewOnly) {
        const { error: outboxError } = await supabase.from("notification_outbox").insert(outboxRows);
        if (outboxError) {
          throw new Error(`Outbox insert failed: ${outboxError.message}`);
        }

        const { error: reminderError } = await supabase.from("compliance_reminders").upsert(
          {
            company_id: company.id,
            reminder_type: "QUARTERLY_COMPLIANCE_REVIEW",
            due_date: quarterReviewDueDate,
            status: "open",
            related_entity_type: "company",
            related_entity_id: company.id,
          },
          {
            onConflict: "company_id,reminder_type,due_date,related_entity_type,related_entity_id",
          },
        );

        if (reminderError) {
          throw new Error(`Quarter reminder upsert failed: ${reminderError.message}`);
        }
      }

      processed.push({
        companyId: company.id,
        companyName: company.trade_name || company.legal_name,
        healthScore: snapshot.healthScore,
        queuedNotifications: outboxRows.length,
      });
    } catch (error) {
      fail("Retention cycle failed for company", {
        companyId: company.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      category: "retention_cycle",
      message: previewOnly ? "Retention cycle preview complete" : "Retention cycle complete",
      processedCount: processed.length,
      quarterReviewDueDate,
      sample: processed.slice(0, 5),
      checkedAt: new Date().toISOString(),
    }),
  );
}

main().catch((error) => {
  fail("Retention cycle crashed", error instanceof Error ? error.message : String(error));
});
