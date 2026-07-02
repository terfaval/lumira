import type { GlossaryCandidate } from "@/src/domain/glossary/types";
import { buildGlossaryContinuityHypotheses } from "@/src/domain/glossary/continuity-hypothesis";

export function projectGlossaryCandidateContinuityVisibility(
  candidates: GlossaryCandidate[],
): GlossaryCandidate[] {
  const hypotheses = buildGlossaryContinuityHypotheses(candidates);
  const hypothesesByCandidateId = new Map<string, (typeof hypotheses)[number]>();
  const summaries = new Map<
    string,
    {
      dreamIds: Set<string>;
      firstSeenAt: string;
      lastSeenAt: string;
    }
  >();

  for (const hypothesis of hypotheses) {
    for (const candidateId of hypothesis.candidateIds) {
      hypothesesByCandidateId.set(candidateId, hypothesis);
    }
  }

  for (const candidate of candidates) {
    const hypothesis = hypothesesByCandidateId.get(candidate.id);
    const key = hypothesis?.hypothesisKey ?? `single::${candidate.sourceCategory}::${candidate.normalizedKey}`;
    const existing = summaries.get(key);

    if (!existing) {
      summaries.set(key, {
        dreamIds: new Set([candidate.reflectiveObjectId]),
        firstSeenAt: candidate.createdAt,
        lastSeenAt: candidate.lastSeenAt,
      });
      continue;
    }

    existing.dreamIds.add(candidate.reflectiveObjectId);
    if (candidate.createdAt < existing.firstSeenAt) {
      existing.firstSeenAt = candidate.createdAt;
    }
    if (candidate.lastSeenAt > existing.lastSeenAt) {
      existing.lastSeenAt = candidate.lastSeenAt;
    }
  }

  return candidates.map((candidate) => {
    const continuityHypothesis = hypothesesByCandidateId.get(candidate.id) ?? null;
    const summary = summaries.get(
      continuityHypothesis?.hypothesisKey ?? `single::${candidate.sourceCategory}::${candidate.normalizedKey}`,
    );
    if (!summary) {
      return candidate;
    }

    return {
      ...candidate,
      continuityHypothesis,
      continuityVisibility: {
        possibleContinuity: summary.dreamIds.size > 1,
        dreamCount: summary.dreamIds.size,
        firstSeenAt: summary.firstSeenAt,
        lastSeenAt: summary.lastSeenAt,
      },
    };
  });
}
