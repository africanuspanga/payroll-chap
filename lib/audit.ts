import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function writeAuditEvent(input: {
  companyId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("audit_events").insert({
    company_id: input.companyId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });
}
