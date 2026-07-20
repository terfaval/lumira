import { createHash } from "node:crypto";

import type { LatentAuthorityProvenance } from "@/src/domain/latent-v2/types";

function canonicalizeValue(input: unknown): unknown {
  if (input === null) {
    return null;
  }

  if (Array.isArray(input)) {
    return input.map((value) => canonicalizeValue(value));
  }

  if (typeof input !== "object") {
    return input;
  }

  const record = input as Record<string, unknown>;

  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, canonicalizeValue(record[key])] as const),
  );
}

export function canonicalizeAuthorityProvenance(
  input: LatentAuthorityProvenance,
): string {
  return JSON.stringify(canonicalizeValue(input));
}

export function buildAuthorityFingerprint(
  input: LatentAuthorityProvenance,
): string {
  return createHash("sha256")
    .update(canonicalizeAuthorityProvenance(input), "utf8")
    .digest("hex");
}
