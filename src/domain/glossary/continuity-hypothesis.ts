import type {
  GlossaryCandidate,
  GlossaryContinuityHypothesis,
  GlossaryContinuityHypothesisGroupingBasis,
} from "@/src/domain/glossary/types";

interface ContinuityHypothesisGroup {
  hypothesisKey: string;
  groupingBasis: GlossaryContinuityHypothesisGroupingBasis;
  sourceCategory: GlossaryCandidate["sourceCategory"];
  candidateIds: string[];
  sightings: GlossaryContinuityHypothesis["sightings"];
  dreamIds: Set<string>;
  firstSeenAt: string;
  lastSeenAt: string;
  observedLabelVariants: Set<string>;
}

function getIdentityKey(candidate: GlossaryCandidate): string | null {
  const identityKey = candidate.identityKey?.trim();
  return identityKey ? identityKey : null;
}

function toContinuityGroupKey(candidate: GlossaryCandidate): {
  hypothesisKey: string;
  groupingBasis: GlossaryContinuityHypothesisGroupingBasis;
} {
  const identityKey = getIdentityKey(candidate);

  if (identityKey) {
    return {
      hypothesisKey: `identity_key::${candidate.sourceCategory}::${identityKey}`,
      groupingBasis: "identity_key",
    };
  }

  return {
    hypothesisKey: `fallback::${candidate.sourceCategory}::${candidate.normalizedKey}`,
    groupingBasis: "source_category_normalized_key",
  };
}

function createGroup(
  candidate: GlossaryCandidate,
  groupKey: ReturnType<typeof toContinuityGroupKey>,
): ContinuityHypothesisGroup {
  return {
    hypothesisKey: groupKey.hypothesisKey,
    groupingBasis: groupKey.groupingBasis,
    sourceCategory: candidate.sourceCategory,
    candidateIds: [candidate.id],
    sightings: [
      {
        candidateId: candidate.id,
        reflectiveObjectId: candidate.reflectiveObjectId,
        sourceObservationId: candidate.sourceObservationId,
        sourceObservationFragmentId: candidate.sourceObservationFragmentId,
      },
    ],
    dreamIds: new Set([candidate.reflectiveObjectId]),
    firstSeenAt: candidate.createdAt,
    lastSeenAt: candidate.lastSeenAt,
    observedLabelVariants: new Set([candidate.displayLabel]),
  };
}

function sortObservedLabelVariants(labels: Set<string>): string[] {
  return Array.from(labels).sort((left, right) => left.localeCompare(right, "hu"));
}

export function buildGlossaryContinuityHypotheses(
  candidates: GlossaryCandidate[],
): GlossaryContinuityHypothesis[] {
  const groups = new Map<string, ContinuityHypothesisGroup>();

  for (const candidate of candidates) {
    const groupKey = toContinuityGroupKey(candidate);
    const existing = groups.get(groupKey.hypothesisKey);

    if (!existing) {
      groups.set(groupKey.hypothesisKey, createGroup(candidate, groupKey));
      continue;
    }

    existing.candidateIds.push(candidate.id);
    existing.sightings.push({
      candidateId: candidate.id,
      reflectiveObjectId: candidate.reflectiveObjectId,
      sourceObservationId: candidate.sourceObservationId,
      sourceObservationFragmentId: candidate.sourceObservationFragmentId,
    });
    existing.dreamIds.add(candidate.reflectiveObjectId);
    existing.observedLabelVariants.add(candidate.displayLabel);

    if (candidate.createdAt < existing.firstSeenAt) {
      existing.firstSeenAt = candidate.createdAt;
    }

    if (candidate.lastSeenAt > existing.lastSeenAt) {
      existing.lastSeenAt = candidate.lastSeenAt;
    }
  }

  return Array.from(groups.values())
    .filter((group) => group.dreamIds.size > 1)
    .map((group) => ({
      hypothesisKey: group.hypothesisKey,
      groupingBasis: group.groupingBasis,
      sourceCategory: group.sourceCategory,
      candidateIds: group.candidateIds,
      sightings: group.sightings,
      dreamCount: group.dreamIds.size,
      firstSeenAt: group.firstSeenAt,
      lastSeenAt: group.lastSeenAt,
      observedLabelVariants: sortObservedLabelVariants(group.observedLabelVariants),
      isFallbackBased: group.groupingBasis !== "identity_key",
    }));
}
