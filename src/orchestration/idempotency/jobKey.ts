// src/orchestration/idempotency/jobKey.ts
export type JobType =
  | "extract_observation"
  | "extract_anchors"
  | "build_session_index"
  | "build_dream_map_v0"
  | "update_latent"
  | "generate_frame";

export function jobIdempotencyKeyV0(jobType: JobType, sessionId: string, materialHash: string) {
  return `v0:${jobType}:${sessionId}:${materialHash}`;
}
