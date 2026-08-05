import { createHash } from "node:crypto";

import type { MemoryCompositionResult } from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortForJson(value));
}

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

export function fingerprintMemoryComposition(value: MemoryCompositionResult): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
