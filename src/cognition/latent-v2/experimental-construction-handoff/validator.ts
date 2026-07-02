import { validateOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor";
import type {
  ExperimentalConstructionHandoffPacket,
  ExperimentalConstructionOutputPacket,
  ExperimentalConstructionValidationResult,
} from "@/src/cognition/latent-v2/experimental-construction-handoff/types";
import { parseExperimentalConstructionOutput } from "@/src/cognition/latent-v2/experimental-construction-handoff/parser";

function buildFailure(
  reason: string,
  details?: Record<string, unknown>,
): Extract<ExperimentalConstructionValidationResult, { ok: false }> {
  return {
    ok: false,
    reason,
    details,
  };
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

function validateExperimentalConstructionAgainstInput(
  input: ExperimentalConstructionHandoffPacket,
  output: ExperimentalConstructionOutputPacket,
): ExperimentalConstructionValidationResult {
  if (
    output.generationContext.priorityReflectiveObjectId !==
    input.generationContext.priorityReflectiveObjectId
  ) {
    return buildFailure("generation_context_priority_object_mismatch");
  }

  if (output.generationContext.observationBundleId !== input.generationContext.observationBundleId) {
    return buildFailure("generation_context_bundle_mismatch");
  }

  const knownCandidateIds = new Set(
    input.discoveryResult.candidateStructures.map((candidate) => candidate.candidateId),
  );
  const consideredCandidateIds = new Set(output.consideration.consideredCandidateIds);
  const missingCandidateIds = sorted(
    [...knownCandidateIds].filter((candidateId) => !consideredCandidateIds.has(candidateId)),
  );

  if (missingCandidateIds.length > 0) {
    return buildFailure("discovery_candidates_not_fully_considered", {
      missingCandidateIds,
    });
  }

  const opportunityKeys = new Set(
    output.opportunities.map((entry) => entry.opportunity.clientOpportunityKey),
  );

  for (const candidateId of output.consideration.promotedDiscoveryCandidateIds) {
    if (!knownCandidateIds.has(candidateId)) {
      return buildFailure("promoted_candidate_out_of_scope", {
        candidateId,
      });
    }
  }

  for (const entry of output.opportunities) {
    for (const candidateId of entry.relatedDiscoveryCandidateIds) {
      if (!knownCandidateIds.has(candidateId)) {
        return buildFailure("related_candidate_out_of_scope", {
          clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          candidateId,
        });
      }
    }

    switch (entry.sourceKind) {
      case "discovery_candidate":
        if (entry.relatedDiscoveryCandidateIds.length !== 1) {
          return buildFailure("discovery_candidate_source_requires_single_candidate", {
            clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          });
        }
        break;
      case "merged_discovery_candidates":
        if (entry.relatedDiscoveryCandidateIds.length < 2) {
          return buildFailure("merge_source_requires_multiple_candidates", {
            clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          });
        }
        break;
      case "split_discovery_candidate":
        if (entry.relatedDiscoveryCandidateIds.length !== 1) {
          return buildFailure("split_source_requires_single_candidate", {
            clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          });
        }
        break;
      case "constructed_from_full_evidence":
        if (entry.relatedDiscoveryCandidateIds.length > 0) {
          return buildFailure("missed_structure_must_not_claim_discovery_candidates", {
            clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          });
        }

        if (!entry.missedStructureRationale) {
          return buildFailure("missed_structure_requires_rationale", {
            clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          });
        }
        break;
    }
  }

  for (const mergeDecision of output.consideration.mergeDecisions) {
    if (mergeDecision.candidateIds.length < 2) {
      return buildFailure("merge_decision_requires_multiple_candidates", {
        opportunityKey: mergeDecision.opportunityKey,
      });
    }

    for (const candidateId of mergeDecision.candidateIds) {
      if (!knownCandidateIds.has(candidateId)) {
        return buildFailure("merge_candidate_out_of_scope", {
          opportunityKey: mergeDecision.opportunityKey,
          candidateId,
        });
      }
    }

    const mergedOpportunity = output.opportunities.find(
      (entry) => entry.opportunity.clientOpportunityKey === mergeDecision.opportunityKey,
    );
    if (!mergedOpportunity || mergedOpportunity.sourceKind !== "merged_discovery_candidates") {
      return buildFailure("merge_decision_missing_matching_opportunity", {
        opportunityKey: mergeDecision.opportunityKey,
      });
    }
  }

  for (const splitDecision of output.consideration.splitDecisions) {
    if (!knownCandidateIds.has(splitDecision.candidateId)) {
      return buildFailure("split_candidate_out_of_scope", {
        candidateId: splitDecision.candidateId,
      });
    }

    if (splitDecision.opportunityKeys.length < 2) {
      return buildFailure("split_decision_requires_multiple_opportunities", {
        candidateId: splitDecision.candidateId,
      });
    }

    for (const opportunityKey of splitDecision.opportunityKeys) {
      if (!opportunityKeys.has(opportunityKey)) {
        return buildFailure("split_decision_missing_opportunity", {
          candidateId: splitDecision.candidateId,
          opportunityKey,
        });
      }

      const splitOpportunity = output.opportunities.find(
        (entry) => entry.opportunity.clientOpportunityKey === opportunityKey,
      );
      if (
        !splitOpportunity ||
        splitOpportunity.sourceKind !== "split_discovery_candidate" ||
        sorted(splitOpportunity.relatedDiscoveryCandidateIds).join(",") !== splitDecision.candidateId
      ) {
        return buildFailure("split_decision_missing_matching_opportunity", {
          candidateId: splitDecision.candidateId,
          opportunityKey,
        });
      }
    }
  }

  for (const opportunityKey of output.consideration.missedStructureOpportunityKeys) {
    const missedOpportunity = output.opportunities.find(
      (entry) => entry.opportunity.clientOpportunityKey === opportunityKey,
    );

    if (!missedOpportunity) {
      return buildFailure("missed_structure_opportunity_missing", {
        opportunityKey,
      });
    }

    if (missedOpportunity.sourceKind !== "constructed_from_full_evidence") {
      return buildFailure("missed_structure_key_must_point_to_full_evidence_opportunity", {
        opportunityKey,
      });
    }
  }

  const baseValidation = validateOpportunityConstructorOutput({
    inputPacket: input.fullEvidence,
    outputPacket: {
      generationContext: {
        runtimeVersion: input.fullEvidence.generationContext.runtimeVersion,
        priorityReflectiveObjectId: input.fullEvidence.generationContext.priorityReflectiveObjectId,
        observationBundleId: input.fullEvidence.generationContext.observationBundleId,
      },
      decision: output.decision,
      opportunities: output.opportunities.map((entry) => entry.opportunity),
    },
  });

  if (!baseValidation.ok) {
    return baseValidation;
  }

  return {
    ok: true,
    value: {
      ...output,
      inputPacket: input,
    },
  };
}

export function validateExperimentalConstructionOutput(input: {
  inputPacket: ExperimentalConstructionHandoffPacket;
  outputPacket: ExperimentalConstructionOutputPacket;
}): ExperimentalConstructionValidationResult {
  return validateExperimentalConstructionAgainstInput(
    input.inputPacket,
    input.outputPacket,
  );
}

export function parseAndValidateExperimentalConstructionOutput(input: {
  input: ExperimentalConstructionHandoffPacket;
  raw: string | unknown;
}): ExperimentalConstructionValidationResult {
  const parsed = parseExperimentalConstructionOutput(input.raw);
  if (!parsed) {
    return buildFailure("invalid_output_packet");
  }

  return validateExperimentalConstructionOutput({
    inputPacket: input.input,
    outputPacket: parsed,
  });
}
