import type { CreateGlossaryCandidateInput } from "@/src/domain/glossary/types";
import {
  cleanGlossaryDisplayText,
  normalizeGlossaryRecognitionText,
} from "@/src/domain/glossary/recognition-normalization";
import type { Observation, ObservationCategory } from "@/src/domain/observation/types";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type {
  ObservationV2Bundle,
  ObservationV2DerivedItem,
  ObservationV2Observation,
  ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";
import {
  getObservationV2DerivedItemDisplayLabel,
  getObservationV2DerivedItemIdentityKey,
  isDreamerIdentityText,
} from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const INTERPRETIVE_MARKERS = ["means", "symbolizes", "represents", "reveals", "proves", "must be"];
const RECURRENCE_MARKERS = ["again", "repeated", "recurring", "similar", "previously", "before", "same pattern", "same "];

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

interface ExtractGlossaryCandidatesFromObservationV2Input {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  bundle: ObservationV2Bundle;
}

interface ExtractGlossaryCandidatesFromObservationV3Input {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  authority: ObservationV3AuthorityRecord;
}

interface CandidateAccumulator {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  identityKey?: string | null;
  normalizedKey: string;
  displayLabel: string;
  sourceCategory: CreateGlossaryCandidateInput["sourceCategory"];
  sourceObservationId: string | null;
  sourceObservationFragmentId: string | null;
  recurrenceCount: number;
}

function formatObservationV3AuthoritySourceId(authorityId: string): string {
  return `observation_v3|authority=${authorityId}`;
}

function formatObservationV3LocalitySourceId(input: {
  authorityId: string;
  localityId: string;
}): string {
  return `${formatObservationV3AuthoritySourceId(input.authorityId)}|locality=${input.localityId}`;
}

function formatObservationV3UnitSourceId(input: {
  authorityId: string;
  unitId: string;
  localityId?: string | null;
  evidenceId?: string | null;
}): string {
  const parts = [
    "observation_v3",
    `authority=${input.authorityId}`,
    `unit=${input.unitId}`,
  ];

  if (input.localityId) {
    parts.push(`locality=${input.localityId}`);
  }

  if (input.evidenceId) {
    parts.push(`evidence=${input.evidenceId}`);
  }

  return parts.join("|");
}

function containsInterpretiveLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return INTERPRETIVE_MARKERS.some((marker) => lower.includes(marker));
}

function containsRecurrenceLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return RECURRENCE_MARKERS.some((marker) => lower.includes(marker));
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

      const displayLabel = cleanGlossaryDisplayText(fragment.fragmentText);
      const normalizedKey = normalizeGlossaryRecognitionText(displayLabel);

      if (!displayLabel || !normalizedKey || isDreamerIdentityText(displayLabel)) {
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
        identityKey: null,
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
    identityKey: candidate.identityKey ?? null,
    normalizedKey: candidate.normalizedKey,
    displayLabel: candidate.displayLabel,
    sourceCategory: candidate.sourceCategory,
    sourceObservationId: candidate.sourceObservationId,
    sourceObservationFragmentId: candidate.sourceObservationFragmentId,
    recurrenceCount: candidate.recurrenceCount,
  }));
}

function addCandidate(
  candidates: Map<string, CandidateAccumulator>,
  candidate: CandidateAccumulator,
): void {
  const key = `${candidate.sourceCategory}::${candidate.normalizedKey}`;
  const existing = candidates.get(key);

  if (existing) {
    existing.recurrenceCount += candidate.recurrenceCount;
    return;
  }

  candidates.set(key, candidate);
}

function buildCandidateFromDerivedItem(input: {
  item: ObservationV2DerivedItem;
  category: CreateGlossaryCandidateInput["sourceCategory"];
  scene: ObservationV2Scene;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
}): CandidateAccumulator | null {
  const displayLabel = cleanGlossaryDisplayText(getObservationV2DerivedItemDisplayLabel(input.item));
  const identityKey = getObservationV2DerivedItemIdentityKey(input.item);
  const normalizedKey = normalizeGlossaryRecognitionText(identityKey);

  if (
    !displayLabel ||
    !normalizedKey ||
    containsInterpretiveLanguage(displayLabel) ||
    isDreamerIdentityText(displayLabel) ||
    isDreamerIdentityText(identityKey)
  ) {
    return null;
  }

  return {
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    identityKey,
    normalizedKey,
    displayLabel,
    sourceCategory: input.category,
    sourceObservationId: input.scene.sceneId,
    sourceObservationFragmentId: input.item.observationIds[0] ?? null,
    recurrenceCount: Math.max(1, new Set(input.item.observationIds).size),
  };
}

function buildRecurrenceCandidateFromObservation(input: {
  observation: ObservationV2Observation;
  scene: ObservationV2Scene;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
}): CandidateAccumulator | null {
  const displayLabel = cleanGlossaryDisplayText(input.observation.text);
  const normalizedKey = normalizeGlossaryRecognitionText(displayLabel);

  if (!displayLabel || !normalizedKey) {
    return null;
  }

  if (!containsRecurrenceLanguage(displayLabel) || containsInterpretiveLanguage(displayLabel)) {
    return null;
  }

  return {
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    identityKey: null,
    normalizedKey,
    displayLabel,
    sourceCategory: "recurrence_candidate",
    sourceObservationId: input.scene.sceneId,
    sourceObservationFragmentId: input.observation.observationId,
    recurrenceCount: 1,
  };
}

export function extractGlossaryCandidatesFromObservationV2Bundle(
  input: ExtractGlossaryCandidatesFromObservationV2Input,
): CreateGlossaryCandidateInput[] {
  const candidates = new Map<string, CandidateAccumulator>();

  for (const scene of input.bundle.scenes) {
    const derivedEntries: Array<{
      items: ObservationV2DerivedItem[];
      category: CreateGlossaryCandidateInput["sourceCategory"];
    }> = [
      { items: scene.derived.actors, category: "actor" },
      { items: scene.derived.locations, category: "location" },
      { items: scene.derived.objects, category: "object" },
      { items: scene.derived.affect, category: "emotion" },
    ];

    for (const entry of derivedEntries) {
      for (const item of entry.items) {
        const candidate = buildCandidateFromDerivedItem({
          item,
          category: entry.category,
          scene,
          userId: input.userId,
          reflectiveObjectId: input.reflectiveObjectId,
        });

        if (candidate) {
          addCandidate(candidates, candidate);
        }
      }
    }

    for (const observation of scene.observations) {
      const candidate = buildRecurrenceCandidateFromObservation({
        observation,
        scene,
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
      });

      if (candidate) {
        addCandidate(candidates, candidate);
      }
    }
  }

  return Array.from(candidates.values()).map((candidate) => ({
    userId: candidate.userId,
    reflectiveObjectId: candidate.reflectiveObjectId,
    identityKey: candidate.identityKey ?? null,
    normalizedKey: candidate.normalizedKey,
    displayLabel: candidate.displayLabel,
    sourceCategory: candidate.sourceCategory,
    sourceObservationId: candidate.sourceObservationId,
    sourceObservationFragmentId: candidate.sourceObservationFragmentId,
    recurrenceCount: candidate.recurrenceCount,
  }));
}

function buildCandidateFromCanonicalLocality(input: {
  authority: ObservationV3AuthorityRecord;
  locality: ObservationV3AuthorityRecord["canonicalCandidate"]["localities"][number];
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
}): CandidateAccumulator | null {
  const displayLabel = cleanGlossaryDisplayText(input.locality.label ?? "");
  const normalizedKey = normalizeGlossaryRecognitionText(displayLabel);

  if (
    !displayLabel
    || !normalizedKey
    || containsInterpretiveLanguage(displayLabel)
    || isDreamerIdentityText(displayLabel)
  ) {
    return null;
  }

  return {
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    identityKey: null,
    normalizedKey,
    displayLabel,
    sourceCategory: "location",
    sourceObservationId: formatObservationV3AuthoritySourceId(input.authority.authorityId),
    sourceObservationFragmentId: formatObservationV3LocalitySourceId({
      authorityId: input.authority.authorityId,
      localityId: input.locality.canonicalLocalityId,
    }),
    recurrenceCount: Math.max(1, input.locality.evidenceRefs.length),
  };
}

function buildRecurrenceCandidateFromCanonicalUnit(input: {
  authority: ObservationV3AuthorityRecord;
  unit: ObservationV3AuthorityRecord["canonicalCandidate"]["descriptiveUnits"][number];
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
}): CandidateAccumulator | null {
  const displayLabel = cleanGlossaryDisplayText(input.unit.statement);
  const normalizedKey = normalizeGlossaryRecognitionText(displayLabel);

  if (!displayLabel || !normalizedKey) {
    return null;
  }

  if (!containsRecurrenceLanguage(displayLabel) || containsInterpretiveLanguage(displayLabel)) {
    return null;
  }

  return {
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    identityKey: null,
    normalizedKey,
    displayLabel,
    sourceCategory: "recurrence_candidate",
    sourceObservationId: input.unit.localityId
      ? formatObservationV3LocalitySourceId({
          authorityId: input.authority.authorityId,
          localityId: input.unit.localityId,
        })
      : formatObservationV3AuthoritySourceId(input.authority.authorityId),
    sourceObservationFragmentId: formatObservationV3UnitSourceId({
      authorityId: input.authority.authorityId,
      unitId: input.unit.canonicalUnitId,
      localityId: input.unit.localityId,
      evidenceId: input.unit.evidenceRefs[0]?.evidenceId ?? null,
    }),
    recurrenceCount: Math.max(1, input.unit.evidenceRefs.length),
  };
}

export function extractGlossaryCandidatesFromObservationV3Authority(
  input: ExtractGlossaryCandidatesFromObservationV3Input,
): CreateGlossaryCandidateInput[] {
  const candidates = new Map<string, CandidateAccumulator>();

  for (const locality of input.authority.canonicalCandidate.localities) {
    const candidate = buildCandidateFromCanonicalLocality({
      authority: input.authority,
      locality,
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
    });

    if (candidate) {
      addCandidate(candidates, candidate);
    }
  }

  for (const unit of input.authority.canonicalCandidate.descriptiveUnits) {
    const candidate = buildRecurrenceCandidateFromCanonicalUnit({
      authority: input.authority,
      unit,
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
    });

    if (candidate) {
      addCandidate(candidates, candidate);
    }
  }

  return Array.from(candidates.values()).map((candidate) => ({
    userId: candidate.userId,
    reflectiveObjectId: candidate.reflectiveObjectId,
    identityKey: candidate.identityKey ?? null,
    normalizedKey: candidate.normalizedKey,
    displayLabel: candidate.displayLabel,
    sourceCategory: candidate.sourceCategory,
    sourceObservationId: candidate.sourceObservationId,
    sourceObservationFragmentId: candidate.sourceObservationFragmentId,
    recurrenceCount: candidate.recurrenceCount,
  }));
}
