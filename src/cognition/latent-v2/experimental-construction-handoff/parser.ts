import { parseOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor";
import type { OpportunityDecisionMode } from "@/src/cognition/latent-v2/opportunity-constructor/types";
import {
  EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION,
  type ExperimentalConstructionOutputPacket,
  type ExperimentalConstructionWrappedOpportunity,
} from "@/src/cognition/latent-v2/experimental-construction-handoff/types";

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

  const strings = value.map((entry) => readString(entry));
  if (strings.some((entry) => entry === null)) {
    return null;
  }

  return strings as string[];
}

function parseWrappedOpportunities(
  value: unknown,
): ExperimentalConstructionWrappedOpportunity[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const wrapperMetadata = value.map((entry) => {
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

  if (wrapperMetadata.includes(null)) {
    return null;
  }

  const parsedBasePacket = parseOpportunityConstructorOutput({
    generationContext: {
      runtimeVersion: "temporary_runtime_version",
      priorityReflectiveObjectId: "temporary_priority_object",
      observationBundleId: "temporary_bundle",
    },
    decision: {
      mode: "opportunities_found",
      silenceReason: null,
    },
    opportunities: wrapperMetadata.map((entry) => entry?.rawOpportunity),
  });

  if (!parsedBasePacket) {
    return null;
  }

  return wrapperMetadata.map((entry, index) => ({
    sourceKind:
      entry?.sourceKind as ExperimentalConstructionWrappedOpportunity["sourceKind"],
    relatedDiscoveryCandidateIds: entry?.relatedDiscoveryCandidateIds ?? [],
    missedStructureRationale: entry?.missedStructureRationale ?? null,
    opportunity: parsedBasePacket.opportunities[index],
  }));
}

export function parseExperimentalConstructionOutput(
  raw: string | unknown,
): ExperimentalConstructionOutputPacket | null {
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

  if (
    runtimeVersion !== EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION ||
    !priorityReflectiveObjectId ||
    !observationBundleId ||
    !decisionMode ||
    !consideredCandidateIds ||
    !promotedDiscoveryCandidateIds ||
    !Array.isArray(consideration.mergeDecisions) ||
    !Array.isArray(consideration.splitDecisions) ||
    !Array.isArray(consideration.missedStructureOpportunityKeys)
  ) {
    return null;
  }

  const mergeDecisions = consideration.mergeDecisions.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const candidateIds = readStringArray(entry.candidateIds);
    const opportunityKey = readString(entry.opportunityKey);
    return candidateIds && opportunityKey ? { candidateIds, opportunityKey } : null;
  });

  const splitDecisions = consideration.splitDecisions.map((entry) => {
    if (!isRecord(entry)) {
      return null;
    }

    const candidateId = readString(entry.candidateId);
    const opportunityKeys = readStringArray(entry.opportunityKeys);
    return candidateId && opportunityKeys ? { candidateId, opportunityKeys } : null;
  });

  const missedStructureOpportunityKeys = readStringArray(
    consideration.missedStructureOpportunityKeys,
  );
  const opportunities = parseWrappedOpportunities(parsed.opportunities);

  if (
    mergeDecisions.includes(null) ||
    splitDecisions.includes(null) ||
    !missedStructureOpportunityKeys ||
    !opportunities
  ) {
    return null;
  }

  return {
    generationContext: {
      runtimeVersion: EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION,
      priorityReflectiveObjectId,
      observationBundleId,
    },
    consideration: {
      consideredCandidateIds,
      promotedDiscoveryCandidateIds,
      mergeDecisions: mergeDecisions.filter(Boolean) as ExperimentalConstructionOutputPacket["consideration"]["mergeDecisions"],
      splitDecisions: splitDecisions.filter(Boolean) as ExperimentalConstructionOutputPacket["consideration"]["splitDecisions"],
      missedStructureOpportunityKeys,
    },
    decision: {
      mode: decisionMode as OpportunityDecisionMode,
      silenceReason,
    },
    opportunities,
  };
}
