// src/db/repositories/jobRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type DomainJobStatus = "running" | "success" | "error" | "skipped";

export type DomainJob = {
  id: string;
  event_id: string | null;
  user_id: string;
  session_id: string | null;
  job_type: string;
  idempotency_key: string;
  status: DomainJobStatus;
  input_hash: string | null;
  output_ref: any;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

type BeginJobResult =
  | { kind: "started"; job: DomainJob }
  | { kind: "skipped"; job: DomainJob };

/**
 * Starts a job run in an idempotent way.
 *
 * Critical: ONLY treat Postgres unique violation (23505) as idempotency conflict.
 * Any other insert error must be thrown to avoid masking RLS/schema/network issues.
 */
export async function beginJobRun(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    session_id?: string;
    event_id?: string;
    job_type: string;
    idempotency_key: string;
    input_hash?: string;
  }
): Promise<BeginJobResult> {
  const ins = await supabase
    .from("domain_jobs")
    .insert({
      user_id: params.user_id,
      session_id: params.session_id ?? null,
      event_id: params.event_id ?? null,
      job_type: params.job_type,
      idempotency_key: params.idempotency_key,
      status: "running",
      input_hash: params.input_hash ?? null,
      output_ref: {},
    })
    .select("*")
    .single();

  if (!ins.error) return { kind: "started", job: ins.data as DomainJob };

  // Only unique violation => fetch existing job
  const code = (ins.error as any)?.code;
  if (code !== "23505") {
    throw ins.error;
  }

  const sel = await supabase
    .from("domain_jobs")
    .select("*")
    .eq("user_id", params.user_id)
    .eq("idempotency_key", params.idempotency_key)
    .single();

  if (sel.error) throw sel.error;

  const job = sel.data as DomainJob;

  // Skip rules:
  // - success: return skipped with refs
  // - running: return skipped (avoid duplicate)
  // - error: do not retry automatically
  if (job.status === "success" || job.status === "running" || job.status === "error") {
    return { kind: "skipped", job };
  }

  // If status=skipped (rare), still treat as skipped.
  return { kind: "skipped", job };
}

export async function finishJobRun(
  supabase: SupabaseClient,
  params: {
    job_id: string;
    status: Exclude<DomainJobStatus, "running">;
    output_ref?: any;
    error?: string | null;
  }
): Promise<DomainJob> {
  const { data, error } = await supabase
    .from("domain_jobs")
    .update({
      status: params.status,
      output_ref: params.output_ref ?? {},
      error: params.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.job_id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DomainJob;
}
