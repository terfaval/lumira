import { createHash } from "node:crypto";

export type IdentityComparisonClassification =
  | "identity_preserved"
  | "deterministic_native_identity_change"
  | "representation_only_hash_change"
  | "substantive_canonical_change"
  | "unexpected_identity_drift"
  | "comparison_unavailable";

export interface IdentitySnapshot {
  candidateId: string | null;
  candidateHash: string | null;
}

export interface IdentityTransitionCheckpoint {
  sourceIdentity: {
    sourceId: string;
    sourceHash: string;
    sourceLength: number;
  };
  parentIdentity: IdentitySnapshot;
  nativeIdentity: IdentitySnapshot;
  legacyIdentity: IdentitySnapshot | null;
  subsystemFingerprint: string;
  policyFingerprint: string;
  lineageRefs: string[];
  substantiveEquality: boolean;
  classification: IdentityComparisonClassification;
  reasonCode: string;
  artifactRefs: string[];
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableStringify(value),
  ).digest("hex");
}

export function classifyIdentityComparison(input: {
  legacyIdentity: IdentitySnapshot | null;
  nativeIdentity: IdentitySnapshot;
  substantiveEquality: boolean;
  lineagePreserved: boolean;
  deterministic: boolean;
}): {
  classification: IdentityComparisonClassification;
  reasonCode: string;
} {
  if (!input.legacyIdentity || !input.legacyIdentity.candidateId || !input.legacyIdentity.candidateHash) {
    return {
      classification: "comparison_unavailable",
      reasonCode: "legacy_identity_unavailable",
    };
  }

  if (!input.lineagePreserved || !input.deterministic || !input.nativeIdentity.candidateId || !input.nativeIdentity.candidateHash) {
    return {
      classification: "unexpected_identity_drift",
      reasonCode: !input.lineagePreserved
        ? "lineage_not_preserved"
        : !input.deterministic
          ? "identity_not_deterministic"
          : "native_identity_unavailable",
    };
  }

  if (input.legacyIdentity.candidateId === input.nativeIdentity.candidateId
    && input.legacyIdentity.candidateHash === input.nativeIdentity.candidateHash) {
    return {
      classification: "identity_preserved",
      reasonCode: "identity_and_hash_preserved",
    };
  }

  if (input.legacyIdentity.candidateId === input.nativeIdentity.candidateId
    && input.legacyIdentity.candidateHash !== input.nativeIdentity.candidateHash) {
    return {
      classification: input.substantiveEquality
        ? "representation_only_hash_change"
        : "substantive_canonical_change",
      reasonCode: input.substantiveEquality
        ? "hash_changed_under_stable_identity"
        : "substantive_content_changed_under_stable_identity",
    };
  }

  return {
    classification: input.substantiveEquality
      ? "deterministic_native_identity_change"
      : "substantive_canonical_change",
    reasonCode: input.substantiveEquality
      ? "native_identity_rebased_on_v3_representation"
      : "substantive_content_changed_with_identity_change",
  };
}
