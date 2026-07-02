import { validateOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor";
import type {
  ExperimentalOpportunityConstructorInputPacket,
  ExperimentalOpportunityConstructorOutputPacket,
  ExperimentalOpportunityConstructorValidationResult,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";
import { parseExperimentalOpportunityConstructorOutput } from "@/src/cognition/latent-v2/experimental-opportunity-constructor/parser";

function buildFailure(
  reason: string,
  details?: Record<string, unknown>,
): Extract<ExperimentalOpportunityConstructorValidationResult, { ok: false }> {
  return {
    ok: false,
    reason,
    details,
  };
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

export function validateExperimentalOpportunityConstructorOutput(input: {
  inputPacket: ExperimentalOpportunityConstructorInputPacket;
  outputPacket: ExperimentalOpportunityConstructorOutputPacket;
}): ExperimentalOpportunityConstructorValidationResult {
  const { inputPacket, outputPacket } = input;

  if (
    outputPacket.generationContext.priorityReflectiveObjectId !==
    inputPacket.generationContext.priorityReflectiveObjectId
  ) {
    return buildFailure("generation_context_priority_object_mismatch");
  }

  if (
    outputPacket.generationContext.observationBundleId !==
    inputPacket.generationContext.observationBundleId
  ) {
    return buildFailure("generation_context_bundle_mismatch");
  }

  const knownCandidateIds = new Set(
    inputPacket.discoveryResult.candidateStructures.map((candidate) => candidate.candidateId),
  );
  const consideredCandidateIds = new Set(outputPacket.consideration.consideredCandidateIds);
  const missingConsideredCandidateIds = sorted(
    [...knownCandidateIds].filter((candidateId) => !consideredCandidateIds.has(candidateId)),
  );

  if (missingConsideredCandidateIds.length > 0) {
    return buildFailure("discovery_candidates_not_fully_considered", {
      missingCandidateIds: missingConsideredCandidateIds,
    });
  }

  const candidateOutcomesById = new Map(
    outputPacket.consideration.candidateOutcomes.map((entry) => [entry.candidateId, entry] as const),
  );
  const missingOutcomeCandidateIds = sorted(
    [...consideredCandidateIds].filter((candidateId) => !candidateOutcomesById.has(candidateId)),
  );

  if (missingOutcomeCandidateIds.length > 0) {
    return buildFailure("candidate_outcome_coverage_mismatch", {
      missingCandidateIds: missingOutcomeCandidateIds,
    });
  }

  for (const candidateId of outputPacket.consideration.promotedDiscoveryCandidateIds) {
    if (!knownCandidateIds.has(candidateId)) {
      return buildFailure("promoted_candidate_out_of_scope", { candidateId });
    }
  }

  for (const candidateId of outputPacket.consideration.rejectedCandidateIds) {
    if (!knownCandidateIds.has(candidateId)) {
      return buildFailure("rejected_candidate_out_of_scope", { candidateId });
    }
  }

  const opportunityKeys = new Set(
    outputPacket.opportunities.map((entry) => entry.opportunity.clientOpportunityKey),
  );

  for (const entry of outputPacket.opportunities) {
    for (const candidateId of entry.relatedDiscoveryCandidateIds) {
      if (!knownCandidateIds.has(candidateId)) {
        return buildFailure("related_candidate_out_of_scope", {
          clientOpportunityKey: entry.opportunity.clientOpportunityKey,
          candidateId,
        });
      }
    }

    if (entry.sourceKind === "constructed_from_full_evidence") {
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
    }
  }

  for (const mergeDecision of outputPacket.consideration.mergeDecisions) {
    if (mergeDecision.candidateIds.length < 2) {
      return buildFailure("merge_decision_requires_multiple_candidates", {
        opportunityKey: mergeDecision.opportunityKey,
      });
    }

    if (!opportunityKeys.has(mergeDecision.opportunityKey)) {
      return buildFailure("merge_decision_missing_matching_opportunity", {
        opportunityKey: mergeDecision.opportunityKey,
      });
    }
  }

  for (const splitDecision of outputPacket.consideration.splitDecisions) {
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
    }
  }

  for (const missedStructure of outputPacket.consideration.missedStructure) {
    if (!opportunityKeys.has(missedStructure.opportunityKey)) {
      return buildFailure("missed_structure_opportunity_missing", {
        opportunityKey: missedStructure.opportunityKey,
      });
    }
  }

  const baseValidation = validateOpportunityConstructorOutput({
    inputPacket: inputPacket.fullEvidence,
    outputPacket: {
      generationContext: {
        runtimeVersion: inputPacket.fullEvidence.generationContext.runtimeVersion,
        priorityReflectiveObjectId:
          inputPacket.fullEvidence.generationContext.priorityReflectiveObjectId,
        observationBundleId: inputPacket.fullEvidence.generationContext.observationBundleId,
      },
      decision: outputPacket.decision,
      opportunities: outputPacket.opportunities.map((entry) => entry.opportunity),
    },
  });

  if (!baseValidation.ok) {
    return baseValidation;
  }

  return {
    ok: true,
    value: {
      ...outputPacket,
      inputPacket,
    },
  };
}

export function parseAndValidateExperimentalOpportunityConstructorOutput(input: {
  input: ExperimentalOpportunityConstructorInputPacket;
  raw: string | unknown;
}): ExperimentalOpportunityConstructorValidationResult {
  const parsed = parseExperimentalOpportunityConstructorOutput(input.raw);
  if (!parsed) {
    return buildFailure("invalid_output_packet");
  }

  return validateExperimentalOpportunityConstructorOutput({
    inputPacket: input.input,
    outputPacket: parsed,
  });
}
