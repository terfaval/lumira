import type { CreateGlossaryCandidateInput } from "@/src/domain/glossary/types";
import type { Observation, ObservationCategory } from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const INTERPRETIVE_MARKERS = ["means", "symbolizes", "represents", "reveals", "proves", "must be"];

const CANDIDATE_CATEGORIES = new Set([
  "actor",
  "location",
  "object",
  "emotion",
  "recurrence_candidate",
] as const);

type GlossaryCandidateCategory = "actor" | "location" | "object" | "emotion" | "recurrence_candidate";

interface ExtractGlossaryCandidatesInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  observations: Observation[];
}

interface CandidateAccumulator {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  normalizedKey: string;
  displayLabel: string;
  sourceCategory: CreateGlossaryCandidateInput["sourceCategory"];
  sourceObservationId: string | null;
  sourceObservationFragmentId: string | null;
  recurrenceCount: number;
}

function toNormalizedKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDisplayLabel(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

function containsInterpretiveLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return INTERPRETIVE_MARKERS.some((marker) => lower.includes(marker));
}

function isGlossaryCandidateCategory(category: ObservationCategory): category is GlossaryCandidateCategory {
  return CANDIDATE_CATEGORIES.has(category as GlossaryCandidateCategory);
}

export function extractGlossaryCandidatesFromObservations(
  input: ExtractGlossaryCandidatesInput,
): CreateGlossaryCandidateInput[] {
  const candidates = new Map<string, CandidateAccumulator>();

  for (const observation of input.observations) {
    for (const fragment of observation.fragments) {
      if (!isGlossaryCandidateCategory(fragment.category)) {
        continue;
      }

      if (containsInterpretiveLanguage(fragment.fragmentText)) {
        continue;
      }

      const displayLabel = cleanDisplayLabel(fragment.fragmentText);
      const normalizedKey = toNormalizedKey(displayLabel);

      if (!displayLabel || !normalizedKey) {
        continue;
      }

      const key = `${fragment.category}::${normalizedKey}`;
      const existing = candidates.get(key);

      if (existing) {
        existing.recurrenceCount += 1;
        continue;
      }

      candidates.set(key, {
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        normalizedKey,
        displayLabel,
        sourceCategory: fragment.category,
        sourceObservationId: observation.id,
        sourceObservationFragmentId: fragment.id,
        recurrenceCount: 1,
      });
    }
  }

  return Array.from(candidates.values()).map((candidate) => ({
    userId: candidate.userId,
    reflectiveObjectId: candidate.reflectiveObjectId,
    normalizedKey: candidate.normalizedKey,
    displayLabel: candidate.displayLabel,
    sourceCategory: candidate.sourceCategory,
    sourceObservationId: candidate.sourceObservationId,
    sourceObservationFragmentId: candidate.sourceObservationFragmentId,
    recurrenceCount: candidate.recurrenceCount,
  }));
}
