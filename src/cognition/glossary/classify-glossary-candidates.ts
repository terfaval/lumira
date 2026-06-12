import { normalizeGlossaryRecognitionText } from "@/src/domain/glossary/recognition-normalization";
import type { CreateGlossaryCandidateInput, GlossaryTerm } from "@/src/domain/glossary/types";

interface ClassifyGlossaryCandidatesInput {
  candidates: CreateGlossaryCandidateInput[];
  terms: GlossaryTerm[];
}

export function classifyGlossaryCandidates(
  input: ClassifyGlossaryCandidatesInput,
): CreateGlossaryCandidateInput[] {
  return input.candidates.map((candidate) => classifyCandidate(candidate, input.terms));
}

function classifyCandidate(
  candidate: CreateGlossaryCandidateInput,
  terms: GlossaryTerm[],
): CreateGlossaryCandidateInput {
  const exactMatches = terms.filter((term) => term.normalizedKey === candidate.normalizedKey);
  const exactMatchIds = toDeterministicEntityIds(exactMatches);

  if (exactMatchIds.length === 1) {
    return {
      ...candidate,
      candidateClass: "match_candidate",
      proposedEntityIds: exactMatchIds,
    };
  }

  if (exactMatchIds.length > 1) {
    return {
      ...candidate,
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: exactMatchIds,
    };
  }

  const aliasMatches = terms.filter((term) =>
    term.aliases.some((alias) => normalizeGlossaryRecognitionText(alias) === candidate.normalizedKey),
  );
  const aliasMatchIds = toDeterministicEntityIds(aliasMatches);

  if (aliasMatchIds.length === 1) {
    return {
      ...candidate,
      candidateClass: "match_candidate",
      proposedEntityIds: aliasMatchIds,
    };
  }

  if (aliasMatchIds.length > 1) {
    return {
      ...candidate,
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: aliasMatchIds,
    };
  }

  return toNewCandidate(candidate);
}

function toDeterministicEntityIds(terms: GlossaryTerm[]): GlossaryTerm["id"][] {
  return Array.from(new Set(terms.map((term) => term.id))).sort((left, right) => left.localeCompare(right));
}

function toNewCandidate(candidate: CreateGlossaryCandidateInput): CreateGlossaryCandidateInput {
  return {
    ...candidate,
    candidateClass: "new_candidate",
    proposedEntityIds: [],
  };
}
