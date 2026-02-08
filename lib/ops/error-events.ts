import type { SupabaseClient } from "@supabase/supabase-js";

export async function logApiFailure(input: {
  supabase?: SupabaseClient;
  companyId?: string | null;
  actorUserId?: string | null;
  route: string;
  method: string;
  category: "api_failure" | "auth_failure" | "migration_failure";
  severity?: "info" | "warn" | "error" | "critical";
  statusCode?: number;
  message: string;
  details?: unknown;
  sendAlert?: boolean;
}) {
  const severity = input.severity ?? (input.statusCode && input.statusCode >= 500 ? "critical" : "error");
  const structured = {
    level: severity,
    category: input.category,
    route: input.route,
    method: input.method,
    statusCode: input.statusCode ?? null,
    message: input.message,
    details: input.details ?? null,
    companyId: input.companyId ?? null,
    actorUserId: input.actorUserId ?? null,
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(structured));

  if (!input.supabase) return;

  await input.supabase.from("system_error_events").insert({
    company_id: input.companyId ?? null,
    actor_user_id: input.actorUserId ?? null,
    category: input.category,
    severity,
    route: input.route,
    method: input.method,
    status_code: input.statusCode ?? null,
    message: input.message,
    details: (input.details ?? {}) as Record<string, unknown>,
  });

  if (!input.companyId || input.sendAlert === false) return;

  if (severity === "critical" || input.sendAlert) {
    await input.supabase.from("notification_outbox").insert({
      company_id: input.companyId,
      channel: "internal",
      template_code: "OPS_API_FAILURE",
      recipient: "ops-alerts@payrollchap.internal",
      payload: structured,
      status: "queued",
    });
  }
}
