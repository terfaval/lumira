import type {
  ProviderEvidenceCompatibilityAssessment,
  ProviderEvidenceReplayMode,
} from "@/src/cognition/observation-v3/provider-evidence/types";

export function classifyProviderEvidenceCompatibility(input: {
  replayMode: ProviderEvidenceReplayMode;
  sourceIdentityMatches: boolean;
  attemptIdentityMatches: boolean;
  evidenceSchemaCompatible: boolean;
  sanitizationCompatible: boolean;
  parserFingerprintMatches: boolean;
  parserSchemaFingerprintMatches: boolean;
  providerPayloadHashMatches: boolean;
  parsedOutputHashMatches: boolean;
  reparsedComparisonAvailable: boolean;
}): ProviderEvidenceCompatibilityAssessment {
  if (!input.sourceIdentityMatches || !input.attemptIdentityMatches) {
    return {
      replayMode: input.replayMode,
      state: "lineage_mismatch",
      replayable: false,
    };
  }

  if (!input.evidenceSchemaCompatible || !input.sanitizationCompatible) {
    return {
      replayMode: input.replayMode,
      state: "not_replayable",
      replayable: false,
    };
  }

  if (!input.providerPayloadHashMatches && input.replayMode !== "frozen_parsed_output") {
    return {
      replayMode: input.replayMode,
      state: "payload_hash_mismatch",
      replayable: false,
    };
  }

  if (!input.parsedOutputHashMatches) {
    return {
      replayMode: input.replayMode,
      state: "parsed_output_hash_mismatch",
      replayable: false,
    };
  }

  if (!input.parserSchemaFingerprintMatches) {
    return {
      replayMode: input.replayMode,
      state: "compatible_with_schema_drift",
      replayable: true,
    };
  }

  if (!input.parserFingerprintMatches) {
    return {
      replayMode: input.replayMode,
      state: "compatible_with_parser_drift",
      replayable: true,
    };
  }

  if (input.replayMode === "dual_validation" && !input.reparsedComparisonAvailable) {
    return {
      replayMode: input.replayMode,
      state: "comparison_unavailable",
      replayable: false,
    };
  }

  return {
    replayMode: input.replayMode,
    state: "compatible",
    replayable: true,
  };
}
