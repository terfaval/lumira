// src/orchestration/idempotency/materialHash.ts
import crypto from "crypto";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Stable canonical JSON:
 * - sorts object keys recursively
 * - preserves array order
 */
export function canonicalize(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

export function canonicalJsonString(value: any): string {
  return JSON.stringify(canonicalize(value));
}

export function materialHashFromPayload(payload: any): string {
  return sha256(canonicalJsonString(payload));
}
