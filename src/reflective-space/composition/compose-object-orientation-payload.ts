import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate } from "@/src/domain/glossary/types";
import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { Opening } from "@/src/domain/openings/types";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import {
  deriveGlossaryCuesFromObservationV2Bundle,
  deriveGlossaryCuesFromObservations,
} from "@/src/reflective-space/composition/derive-glossary-cues";
import { countOpeningsByState, type OrientationOpeningCard } from "@/src/ui/object-orientation/view-model";

const OBSERVATION_LIMIT = 3;
const RECENT_OPENINGS_LIMIT = 12;

type OrientationOpeningState = OrientationOpeningCard["state"];

export interface ObjectOrientationPayload {
  dream: {
    id: string;
    title: string;
    preview: string;
    editHref: string;
  };
  glossary: {
    items: Array<{
      label: string;
      category: string;
      detail: string;
    }>;
  };
  openingStack: {
    items: OrientationOpeningCard[];
    counts: Record<"new" | "active" | "dormant" | "all", number>;
    defaultView: "new";
  };
  threadOverview: Array<{
    state: OrientationOpeningState;
    count: number;
  }>;
}

export interface ComposeObjectOrientationPayloadInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationRepository: ObservationRepository;
  observationV2Repository: ObservationV2Repository;
  glossaryRepository: GlossaryRepository;
  threadRepository: ThreadRepository;
  openingRepository: OpeningRepository;
}

function toOpeningState(opening: Opening): OrientationOpeningState | null {
  if (opening.suppressionState === "suppressed" && opening.suppressionRevisitEligibility !== "hidden") {
    return "dormant";
  }

  if (opening.state === "activated") {
    return "active";
  }

  if (opening.state === "available" && opening.suppressionState === "none") {
    return "new";
  }

  return null;
}

function toOpeningCtaLabel(state: OrientationOpeningState): string {
  switch (state) {
    case "active":
      return "Continue in Deep Reflection";
    case "dormant":
      return "Re-enter in Deep Reflection";
    default:
      return "Begin in Deep Reflection";
  }
}

function toOpeningTitle(opening: Opening): string {
  return opening.utterance.trim().slice(0, 160);
}

function toGlossaryDetail(input: { candidate?: GlossaryCandidate; cue?: { phrasing: string } }): string {
  if (input.candidate) {
    const recurrence = input.candidate.recurrenceCount > 1 ? `${input.candidate.recurrenceCount} returns` : "seen here";
    return `${input.candidate.sourceCategory.replaceAll("_", " ")} • ${recurrence}`;
  }

  return input.cue?.phrasing ?? "recognized in this dream";
}

function uniqueByLabel<T extends { label: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const ordered: T[] = [];

  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    ordered.push(item);
  }

  return ordered;
}

function isOpeningForObject(opening: Opening, reflectiveObjectId: ReflectiveObjectId): boolean {
  return opening.provenance.sourceObjects.includes(reflectiveObjectId);
}

export async function composeObjectOrientationPayload(
  input: ComposeObjectOrientationPayloadInput,
): Promise<ObjectOrientationPayload | null> {
  const reflectiveObject = await input.reflectiveObjectRepository.getById(input.reflectiveObjectId, input.userId);

  if (!reflectiveObject) {
    return null;
  }

  const [observationBundle, observations, glossaryCandidates, recentOpenings] = await Promise.all([
    input.observationV2Repository.getByReflectiveObjectId(input.reflectiveObjectId, input.userId),
    input.observationRepository.listByReflectiveObject({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      limit: OBSERVATION_LIMIT,
    }),
    input.glossaryRepository.listCandidatesByReflectiveObject(input.userId, input.reflectiveObjectId),
    input.openingRepository.listRecentOpeningsByUser(input.userId, RECENT_OPENINGS_LIMIT),
  ]);

  const glossaryCues = observationBundle
    ? deriveGlossaryCuesFromObservationV2Bundle(observationBundle)
    : deriveGlossaryCuesFromObservations(observations);
  const glossaryItems = uniqueByLabel([
    ...glossaryCandidates.map((candidate) => ({
      label: candidate.displayLabel,
      category: candidate.sourceCategory,
      detail: toGlossaryDetail({ candidate }),
    })),
    ...glossaryCues.map((cue) => ({
      label: cue.label,
      category: cue.category,
      detail: toGlossaryDetail({ cue }),
    })),
  ]);

  const openingItems = recentOpenings
    .filter((opening) => isOpeningForObject(opening, input.reflectiveObjectId))
    .map((opening) => {
      const state = toOpeningState(opening);
      if (!state) {
        return null;
      }

      return {
        id: opening.id,
        title: toOpeningTitle(opening),
        tone: opening.tone,
        kind: opening.openingType,
        state,
        ctaLabel: toOpeningCtaLabel(state),
        href: `/objects/${input.reflectiveObjectId}/reflect`,
      } satisfies OrientationOpeningCard;
    })
    .filter((item): item is OrientationOpeningCard => item !== null);

  const openingCounts = countOpeningsByState(openingItems);

  return {
    dream: {
      id: reflectiveObject.id,
      title: reflectiveObject.title,
      preview: reflectiveObject.primaryContent,
      editHref: `/objects/${reflectiveObject.id}/reflect`,
    },
    glossary: {
      items: glossaryItems,
    },
    openingStack: {
      items: openingItems,
      counts: openingCounts,
      defaultView: "new",
    },
    threadOverview: [
      { state: "new", count: openingCounts.new },
      { state: "active", count: openingCounts.active },
      { state: "dormant", count: openingCounts.dormant },
    ],
  };
}
