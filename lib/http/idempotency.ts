import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type IdempotencyRow = {
  company_id: string;
  endpoint: string;
  idempotency_key: string;
  request_hash: string;
  status: "in_progress" | "completed" | "failed";
  response_code: number | null;
  response_body: unknown;
  updated_at: string;
  created_by: string | null;
};

export type IdempotencyResolution =
  | { mode: "none" }
  | { mode: "acquired"; key: string }
  | { mode: "in_progress" }
  | { mode: "conflict" }
  | { mode: "replay"; responseCode: number; responseBody: unknown };

export function readIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key");
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, 200);
}

export function hashIdempotencyPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

export async function resolveIdempotencyRequest(input: {
  supabase: SupabaseClient;
  companyId: string;
  actorUserId: string;
  endpoint: string;
  key: string | null;
  requestHash: string;
}) {
  if (!input.key) {
    return { mode: "none" } as IdempotencyResolution;
  }

  const insertPayload = {
    company_id: input.companyId,
    endpoint: input.endpoint,
    idempotency_key: input.key,
    request_hash: input.requestHash,
    status: "in_progress" as const,
    created_by: input.actorUserId,
  };

  const { error: insertError } = await input.supabase.from("idempotency_requests").insert(insertPayload);

  if (!insertError) {
    return { mode: "acquired", key: input.key } as IdempotencyResolution;
  }

  if (insertError.code !== "23505") {
    throw new Error(`Idempotency insert failed: ${insertError.message}`);
  }

  const { data: existing, error: existingError } = await input.supabase
    .from("idempotency_requests")
    .select("company_id, endpoint, idempotency_key, request_hash, status, response_code, response_body, updated_at, created_by")
    .eq("company_id", input.companyId)
    .eq("endpoint", input.endpoint)
    .eq("idempotency_key", input.key)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Failed to load idempotency record");
  }

  const row = existing as IdempotencyRow;

  if (row.request_hash !== input.requestHash) {
    return { mode: "conflict" } as IdempotencyResolution;
  }

  if (row.status === "completed" && row.response_code && row.response_body !== null && row.response_body !== undefined) {
    return {
      mode: "replay",
      responseCode: row.response_code,
      responseBody: row.response_body,
    } as IdempotencyResolution;
  }

  const staleCutoff = Date.now() - 5 * 60 * 1000;
  const rowUpdatedAt = Date.parse(row.updated_at);
  const isStale = Number.isFinite(rowUpdatedAt) ? rowUpdatedAt < staleCutoff : true;

  if (row.status === "in_progress" && !isStale) {
    return { mode: "in_progress" } as IdempotencyResolution;
  }

  const { error: updateError } = await input.supabase
    .from("idempotency_requests")
    .update({
      status: "in_progress",
      request_hash: input.requestHash,
      response_code: null,
      response_body: null,
      error_body: null,
      created_by: input.actorUserId,
    })
    .eq("company_id", input.companyId)
    .eq("endpoint", input.endpoint)
    .eq("idempotency_key", input.key);

  if (updateError) {
    throw new Error(`Idempotency update failed: ${updateError.message}`);
  }

  return { mode: "acquired", key: input.key } as IdempotencyResolution;
}

export async function finalizeIdempotencySuccess(input: {
  supabase: SupabaseClient;
  companyId: string;
  endpoint: string;
  key: string | null;
  responseCode: number;
  responseBody: unknown;
}) {
  if (!input.key) return;

  await input.supabase
    .from("idempotency_requests")
    .update({
      status: "completed",
      response_code: input.responseCode,
      response_body: input.responseBody,
      error_body: null,
    })
    .eq("company_id", input.companyId)
    .eq("endpoint", input.endpoint)
    .eq("idempotency_key", input.key);
}

export async function finalizeIdempotencyFailure(input: {
  supabase: SupabaseClient;
  companyId: string;
  endpoint: string;
  key: string | null;
  responseCode: number;
  errorBody: unknown;
}) {
  if (!input.key) return;

  await input.supabase
    .from("idempotency_requests")
    .update({
      status: "failed",
      response_code: input.responseCode,
      error_body: input.errorBody,
    })
    .eq("company_id", input.companyId)
    .eq("endpoint", input.endpoint)
    .eq("idempotency_key", input.key);
}
