import { createHash } from "node:crypto";

import { AUTHORITY_ADMISSION_EVALUATOR_VERSION, type AdmissionPolicy } from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
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

function fingerprintPolicy(policy: Omit<AdmissionPolicy, "policyFingerprint">): string {
  return createHash("sha256").update(stableStringify(policy)).digest("hex");
}

const SHADOW_V1_POLICY_BODY = {
  policyVersion: "shadow-v1",
  evaluatorVersion: AUTHORITY_ADMISSION_EVALUATOR_VERSION,
  admittedDispositions: ["admitted", "admitted_with_observations"] as const,
  failClosedOnMissingCompleteness: true,
  failClosedOnMissingProvenance: true,
  failClosedOnEvidenceIntegrityFailure: true,
  failClosedOnRealizationFailure: true,
  allowObservedAdmission: true,
  allowIndeterminateUncertainty: true,
  allowRecoveryDeferral: true,
  observationalTailCharThreshold: 40,
  materialTailCharThreshold: 80,
  materialTailCoverageRatioThreshold: 0.3,
  shortSourceCriticalEndingCharThreshold: 160,
} satisfies Omit<AdmissionPolicy, "policyFingerprint">;

const SHADOW_V2_POLICY_BODY = {
  ...SHADOW_V1_POLICY_BODY,
  policyVersion: "shadow-v2",
} satisfies Omit<AdmissionPolicy, "policyFingerprint">;

export const FROZEN_SHADOW_V1_AUTHORITY_ADMISSION_POLICY: AdmissionPolicy = {
  ...SHADOW_V1_POLICY_BODY,
  policyFingerprint: fingerprintPolicy(SHADOW_V1_POLICY_BODY),
};

export const DEFAULT_AUTHORITY_ADMISSION_POLICY: AdmissionPolicy = {
  ...SHADOW_V2_POLICY_BODY,
  policyFingerprint: fingerprintPolicy(SHADOW_V2_POLICY_BODY),
};
