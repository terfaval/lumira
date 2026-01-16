// src/orchestration/idempotency/jobKey.ts
export type JobType =
  | "extract_observation"
  | "build_session_index"
  | "update_latent"
  | "generate_frame";

export function jobIdempotencyKeyV0(jobType: JobType, sessionId: string, materialHash: string) {
  return `v0:${jobType}:${sessionId}:${materialHash}`;
}
