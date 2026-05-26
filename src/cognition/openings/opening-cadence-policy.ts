import type {
  NoOpeningReason,
  Opening,
  OpeningCadenceWindow,
  OpeningCandidate,
  OpeningFingerprint,
  OpeningSimilarityScope,
} from "@/src/domain/openings/types";

const DEFAULT_CADENCE_WINDOW: OpeningCadenceWindow = {
  maxOpeningsPerInvocation: 2,
  globalCooldownMinutes: 20,
  similarityWindowHours: 24,
  suppressionWindowDays: 14,
};

const FINGERPRINT_SCOPES: OpeningSimilarityScope[] = [
  "latent_lineage_overlap",
  "glossary_overlap",
  "reflective_object_overlap",
  "utterance_pattern_overlap",
];

interface CadenceInput {
  candidates: OpeningCandidate[];
  recentOpenings: Opening[];
  nowIso?: string;
  cadenceWindow?: OpeningCadenceWindow;
}

interface CadenceDecision {
  openings: OpeningCandidate[];
  noOpeningReason: NoOpeningReason | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function minuteDiff(laterIso: string, earlierIso: string): number {
  return Math.max(0, (Date.parse(laterIso) - Date.parse(earlierIso)) / 60000);
}

function hourDiff(laterIso: string, earlierIso: string): number {
  return Math.max(0, (Date.parse(laterIso) - Date.parse(earlierIso)) / 3600000);
}

function dayDiff(laterIso: string, earlierIso: string): number {
  return Math.max(0, (Date.parse(laterIso) - Date.parse(earlierIso)) / 86400000);
}

function isSuppressionActive(opening: Opening, nowIso: string): boolean {
  if (opening.suppressionState !== "suppressed") {
    return false;
  }

  if (opening.suppressionDuration === "user_reactivated") {
    return false;
  }

  if (opening.suppressionDuration === "temporary") {
    const expiry = opening.suppressionExpiry.at;
    if (!expiry) {
      return true;
    }

    return Date.parse(nowIso) < Date.parse(expiry);
  }

  return true;
}

export function toOpeningFingerprint(candidate: OpeningCandidate): OpeningFingerprint {
  const latentPart = candidate.provenance.latentSnapshotReference ?? "none";
  const objectPart = candidate.provenance.sourceObjects.slice().sort().join(",");
  const glossaryPart = candidate.provenance.sourceGlossaryTerms.slice().sort().join(",");
  const utterancePart = normalize(candidate.utterance).slice(0, 64);

  return {
    seed: `${candidate.openingType}|${latentPart}|${objectPart}|${glossaryPart}|${utterancePart}`,
    scopes: FINGERPRINT_SCOPES,
    latentSnapshotReference: candidate.provenance.latentSnapshotReference,
  };
}

function hasOverlap(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function isSimilar(candidate: OpeningCandidate, opening: Opening): boolean {
  if (
    candidate.provenance.latentSnapshotReference &&
    candidate.provenance.latentSnapshotReference === opening.provenance.latentSnapshotReference
  ) {
    return true;
  }

  if (hasOverlap(candidate.provenance.sourceObjects, opening.provenance.sourceObjects)) {
    return true;
  }

  if (hasOverlap(candidate.provenance.sourceGlossaryTerms, opening.provenance.sourceGlossaryTerms)) {
    return true;
  }

  if (normalize(candidate.utterance) === normalize(opening.utterance)) {
    return true;
  }

  return false;
}

export function applyOpeningCadencePolicy(input: CadenceInput): CadenceDecision {
  const cadenceWindow = input.cadenceWindow ?? DEFAULT_CADENCE_WINDOW;
  const nowIso = input.nowIso ?? new Date().toISOString();

  if (input.candidates.length === 0) {
    return { openings: [], noOpeningReason: "no_candidates" };
  }

  const newestOpening = input.recentOpenings[0];
  if (newestOpening && minuteDiff(nowIso, newestOpening.createdAt) < cadenceWindow.globalCooldownMinutes) {
    return { openings: [], noOpeningReason: "recent_resurfacing" };
  }

  const approved: OpeningCandidate[] = [];
  const seenFingerprints = new Set<string>();
  let rejectedReason: NoOpeningReason | null = null;

  for (const candidate of input.candidates) {
    if (candidate.provenance.confidenceBand === "low") {
      rejectedReason = rejectedReason ?? "low_confidence";
      continue;
    }

    const suppressionOverlap = input.recentOpenings.some((opening) => {
      if (!isSuppressionActive(opening, nowIso)) {
        return false;
      }

      if (opening.suppressionDuration === "indefinite") {
        return isSimilar(candidate, opening);
      }

      if (
        opening.suppressionDuration === "temporary" &&
        dayDiff(nowIso, opening.updatedAt) > cadenceWindow.suppressionWindowDays
      ) {
        return false;
      }
      return isSimilar(candidate, opening);
    });

    if (suppressionOverlap) {
      rejectedReason = "suppression_overlap";
      continue;
    }

    const similarityOverlap = input.recentOpenings.some((opening) => {
      if (hourDiff(nowIso, opening.createdAt) > cadenceWindow.similarityWindowHours) {
        return false;
      }
      return isSimilar(candidate, opening);
    });

    if (similarityOverlap) {
      rejectedReason = rejectedReason ?? "repetition_risk";
      continue;
    }

    const fingerprint = toOpeningFingerprint(candidate);
    if (seenFingerprints.has(fingerprint.seed)) {
      rejectedReason = rejectedReason ?? "repetition_risk";
      continue;
    }

    seenFingerprints.add(fingerprint.seed);
    approved.push(candidate);

    if (approved.length >= cadenceWindow.maxOpeningsPerInvocation) {
      break;
    }
  }

  if (approved.length === 0) {
    return {
      openings: [],
      noOpeningReason: rejectedReason ?? "pacing_overload",
    };
  }

  return { openings: approved, noOpeningReason: null };
}
