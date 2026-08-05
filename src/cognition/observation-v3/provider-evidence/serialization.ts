import { createHash } from "node:crypto";

function toStableJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      const stable = toStableJsonValue(entry);
      return stable === undefined ? null : stable;
    });
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .flatMap((key) => {
        const stable = toStableJsonValue(record[key]);
        return stable === undefined ? [] : [[key, stable] as const];
      });
    return Object.fromEntries(entries);
  }

  return String(value);
}

export function stableProviderEvidenceJsonValue(value: unknown): unknown {
  return toStableJsonValue(value);
}

export function stableProviderEvidenceStringify(value: unknown): string {
  return `${JSON.stringify(stableProviderEvidenceJsonValue(value), null, 2)}\n`;
}

export function sha256StableProviderEvidence(value: unknown): string {
  return createHash("sha256").update(stableProviderEvidenceStringify(value), "utf8").digest("hex");
}
