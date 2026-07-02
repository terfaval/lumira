import { parseOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor";
import type { OpportunityDecisionMode } from "@/src/cognition/latent-v2/opportunity-constructor/types";
import {
  EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION,
  type ExperimentalOpportunityConstructorOutputPacket,
  type ExperimentalOpportunityConstructorWrappedOpportunity,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return readString(value);
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value.map((entry) => readString(entry));
  if (normalized.some((entry) => entry === null)) {
    return null;
  }

  return normalized as string[];
}

function parseWrappedOpportunities(
  value: unknown,
): ExperimentalOpportunityConstructorWrappedOpportunity[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const metadata = value.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const sourceKind = readString(entry.sourceKind);
    const relatedDiscoveryCandidateIds = readStringArray(entry.relatedDiscoveryCandidateIds);
    const missedStructureRationale = readOptionalString(entry.missedStructureRationale);

    if (!sourceKind || !relatedDiscoveryCandidateIds || !("opportunity" in entry)) {
      return null;
    }

    return {
      sourceKind,
      relatedDiscoveryCandidateIds,
      missedStructureRationale,
      rawOpportunity: entry.opportunity,
    };
  });

  if (metadata.includes(null)) {
    return null;
  }

  const parsedOpportunityPacket = parseOpportunityConstructorOutput({
    generationContext: {
      runtimeVersion: "temporary_runtime_version",
      priorityReflectiveObjectId: "temporary_priority_object",
      observationBundleId: "temporary_bundle",
    },
    decision: {
      mode: "opportunities_found",
      silenceReason: null,
    },
    opportunities: metadata.map((entry) => entry?.rawOpportunity),
  });

  if (!parsedOpportunityPacket) {
    return null;
  }

  return metadata.map((entry, index) => ({
    sourceKind:
      entry?.sourceKind as ExperimentalOpportunityConstructorWrappedOpportunity["sourceKind"],
    relatedDiscoveryCandidateIds: entry?.relatedDiscoveryCandidateIds ?? [],
    missedStructureRationale: entry?.missedStructureRationale ?? null,
    opportunity: parsedOpportunityPacket.opportunities[index],
  }));
}

export function parseExperimentalOpportunityConstructorOutput(
  raw: string | unknown,
): ExperimentalOpportunityConstructorOutputPacket | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const generationContext = isRecord(parsed.generationContext) ? parsed.generationContext : null;
  const consideration = isRecord(parsed.consideration) ? parsed.consideration : null;
  const decision = isRecord(parsed.decision) ? parsed.decision : null;

  if (!generationContext || !consideration || !decision) {
    return null;
  }

  const runtimeVersion = readString(generationContext.runtimeVersion);
  const priorityReflectiveObjectId = readString(generationContext.priorityReflectiveObjectId);
  const observationBundleId = readString(generationContext.observationBundleId);
  const decisionMode = readString(decision.mode);
  const silenceReason = readOptionalString(decision.silenceReason);
  const consideredCandidateIds = readStringArray(consideration.consideredCandidateIds);
  const promotedDiscoveryCandidateIds = readStringArray(consideration.promotedDiscoveryCandidateIds);
  const rejectedCandidateIds = readStringArray(consideration.rejectedCandidateIds);

  if (
    runtimeVersion !== EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION ||
    !priorityReflectiveObjectId ||
    !observationBundleId ||
    !decisionMode ||
    !consideredCandidateIds ||
    !promotedDiscoveryCandidateIds ||
    !rejectedCandidateIds ||
    !Array.isArray(consideration.candidateOutcomes) ||
    !Array.isArray(consideration.mergeDecisions) ||
    !Array.isArray(consideration.splitDecisions) ||
    !Array.isArray(consideration.missedStructure)
  ) {
    return null;
  }

  const candidateOutcomes = consideration.candidateOutcomes.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const candidateId = readString(entry.candidateId);
    const outcome = readString(entry.outcome);
    const opportunityKeys = readStringArray(entry.opportunityKeys);
    const rationale = readString(entry.rationale);

    return candidateId && outcome && opportunityKeys && rationale
      ? { candidateId, outcome, opportunityKeys, rationale }
      : null;
  });

  const mergeDecisions = consideration.mergeDecisions.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const candidateIds = readStringArray(entry.candidateIds);
    const opportunityKey = readString(entry.opportunityKey);
    const rationale = readString(entry.rationale);
    return candidateIds && opportunityKey && rationale
      ? { candidateIds, opportunityKey, rationale }
      : null;
  });

  const splitDecisions = consideration.splitDecisions.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const candidateId = readString(entry.candidateId);
    const opportunityKeys = readStringArray(entry.opportunityKeys);
    const rationale = readString(entry.rationale);
    return candidateId && opportunityKeys && rationale
      ? { candidateId, opportunityKeys, rationale }
      : null;
  });

  const missedStructure = consideration.missedStructure.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const opportunityKey = readString(entry.opportunityKey);
    const rationale = readString(entry.rationale);
    const supportingObservationIds = readStringArray(entry.supportingObservationIds);
    return opportunityKey && rationale && supportingObservationIds
      ? { opportunityKey, rationale, supportingObservationIds }
      : null;
  });

  const opportunities = parseWrappedOpportunities(parsed.opportunities);

  if (
    candidateOutcomes.includes(null) ||
    mergeDecisions.includes(null) ||
    splitDecisions.includes(null) ||
    missedStructure.includes(null) ||
    !opportunities
  ) {
    return null;
  }

  return {
    generationContext: {
      runtimeVersion: EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION,
      priorityReflectiveObjectId,
      observationBundleId,
    },
    consideration: {
      consideredCandidateIds,
      promotedDiscoveryCandidateIds,
      rejectedCandidateIds,
      candidateOutcomes:
        candidateOutcomes as ExperimentalOpportunityConstructorOutputPacket["consideration"]["candidateOutcomes"],
      mergeDecisions:
        mergeDecisions as ExperimentalOpportunityConstructorOutputPacket["consideration"]["mergeDecisions"],
      splitDecisions:
        splitDecisions as ExperimentalOpportunityConstructorOutputPacket["consideration"]["splitDecisions"],
      missedStructure:
        missedStructure as ExperimentalOpportunityConstructorOutputPacket["consideration"]["missedStructure"],
    },
    decision: {
      mode: decisionMode as OpportunityDecisionMode,
      silenceReason,
    },
    opportunities,
  };
}
