import type {
  ObservationV3ReplayCompatibilityClassification,
  ObservationV3ReplayFailure,
} from "@/src/cognition/observation-v3/pipeline/replay/replay-types";

export function classifyReplayLineage(input: {
  extractionAvailable: boolean;
  extractionRawPreserved: boolean;
  extractionCorrupt: boolean;
  supplementalRequired: boolean;
  supplementalAvailable: boolean;
  supplementalCorrupt: boolean;
}): {
  classification: ObservationV3ReplayCompatibilityClassification;
  failure: ObservationV3ReplayFailure | null;
  lineage: Record<string, unknown>;
} {
  if (input.extractionCorrupt || input.supplementalCorrupt) {
    return {
      classification: "artifact_incomplete",
      failure: {
        classification: "corrupt_artifact",
        message: "corrupt_preserved_artifact",
        sourceArtifactRef: null,
      },
      lineage: {
        extractionAvailable: input.extractionAvailable,
        supplementalAvailable: input.supplementalAvailable,
      },
    };
  }

  if (!input.extractionAvailable || !input.extractionRawPreserved) {
    return {
      classification: "artifact_incomplete",
      failure: {
        classification: "missing_replay_evidence",
        message: "descriptive_extraction_provider_boundary_missing",
        sourceArtifactRef: null,
      },
      lineage: {
        extractionAvailable: input.extractionAvailable,
        extractionRawPreserved: input.extractionRawPreserved,
      },
    };
  }

  if (input.supplementalRequired && !input.supplementalAvailable) {
    return {
      classification: "artifact_incomplete",
      failure: {
        classification: "missing_replay_evidence",
        message: "supplemental_realization_provider_boundary_missing",
        sourceArtifactRef: null,
      },
      lineage: {
        supplementalRequired: true,
        supplementalAvailable: false,
      },
    };
  }

  return {
    classification: "fully_replayable",
    failure: null,
    lineage: {
      extractionAvailable: true,
      extractionRawPreserved: true,
      supplementalRequired: input.supplementalRequired,
      supplementalAvailable: input.supplementalAvailable,
    },
  };
}
