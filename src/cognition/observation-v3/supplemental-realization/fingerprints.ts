import { createHash } from "node:crypto";

import type {
  PlannedSupplementalRealization,
  SupplementalRealizationRunResult,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortForJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForJson(entry)]),
    );
  }
  return value;
}

export function stableSupplementalRealizationStringify(value: unknown): string {
  return JSON.stringify(sortForJson(value));
}

export function fingerprintSupplementalRealization(value: SupplementalRealizationRunResult): string {
  return createHash("sha256").update(stableSupplementalRealizationStringify(value)).digest("hex");
}

export function fingerprintSupplementalRealizationPlan(value: PlannedSupplementalRealization): string {
  return createHash("sha256").update(stableSupplementalRealizationStringify(value)).digest("hex");
}
