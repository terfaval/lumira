import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type {
  GlossaryCandidate,
  GlossaryEntityType,
  GlossaryTerm,
} from "@/src/domain/glossary/types";
import type { ObservationCategory } from "@/src/domain/observation/types";
import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { Opening } from "@/src/domain/openings/types";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import {
  countOpeningsByState,
  type GlossaryPanelItem,
  type GlossaryPanelProposedEntity,
  type OrientationOpeningCard,
} from "@/src/ui/object-orientation/view-model";

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
    items: GlossaryPanelItem[];
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

function isOpeningForObject(opening: Opening, reflectiveObjectId: ReflectiveObjectId): boolean {
  return opening.provenance.sourceObjects.includes(reflectiveObjectId);
}

function mapSourceCategoryToEntityType(sourceCategory: ObservationCategory): GlossaryEntityType {
  switch (sourceCategory) {
    case "actor":
      return "person";
    case "location":
    case "scene":
      return "place";
    case "object":
      return "object";
    case "interaction":
      return "role";
    default:
      return "concept";
  }
}

function candidateStatus(candidate: GlossaryCandidate): "match" | "ambiguous" | "new" {
  switch (candidate.candidateClass) {
    case "match_candidate":
      return "match";
    case "ambiguous_match_candidate":
      return "ambiguous";
    default:
      return "new";
  }
}

function toProposedEntity(term: GlossaryTerm): GlossaryPanelProposedEntity {
  return {
    id: term.id,
    canonicalLabel: term.canonicalLabel,
    type: term.type,
    appearanceCount: term.appearanceCount,
    generalNote: term.generalNote,
  };
}

function toCandidateItem(candidate: GlossaryCandidate, termsById: Map<string, GlossaryTerm>): GlossaryPanelItem {
  const proposedEntities = candidate.proposedEntityIds
    .map((termId) => termsById.get(termId))
    .filter((term): term is GlossaryTerm => term !== undefined)
    .map(toProposedEntity);

  const entityType = proposedEntities[0]?.type ?? mapSourceCategoryToEntityType(candidate.sourceCategory);

  return {
    id: candidate.id,
    kind: "candidate",
    candidateId: candidate.id,
    candidateClass: candidate.candidateClass,
    candidateState: candidate.state,
    label: candidate.displayLabel,
    canonicalLabel: candidate.displayLabel,
    entityType,
    sourceCategory: candidate.sourceCategory,
    recurrenceCount: candidate.recurrenceCount,
    status: candidateStatus(candidate),
    proposedEntities,
    href: null,
  };
}

function toSavedEntityItem(term: GlossaryTerm): GlossaryPanelItem {
  return {
    id: `saved-${term.id}`,
    kind: "saved",
    label: term.canonicalLabel,
    canonicalLabel: term.canonicalLabel,
    entityType: term.type,
    sourceCategory: "saved_entity",
    recurrenceCount: null,
    status: "saved",
    proposedEntities: [],
    href: null,
  };
}

function uniqueGlossaryItems(items: GlossaryPanelItem[]): GlossaryPanelItem[] {
  const seen = new Set<string>();
  const ordered: GlossaryPanelItem[] = [];

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

export async function composeObjectOrientationPayload(
  input: ComposeObjectOrientationPayloadInput,
): Promise<ObjectOrientationPayload | null> {
  const reflectiveObject = await input.reflectiveObjectRepository.getById(input.reflectiveObjectId, input.userId);

  if (!reflectiveObject) {
    return null;
  }

  const [, , glossaryCandidates, recentOpenings, glossaryTerms, savedTerms] = await Promise.all([
    input.observationV2Repository.getByReflectiveObjectId(input.reflectiveObjectId, input.userId),
    input.observationRepository.listByReflectiveObject({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      limit: OBSERVATION_LIMIT,
    }),
    input.glossaryRepository.listCandidatesByReflectiveObject(input.userId, input.reflectiveObjectId),
    input.openingRepository.listRecentOpeningsByUser(input.userId, RECENT_OPENINGS_LIMIT),
    input.glossaryRepository.listTerms(input.userId),
    input.glossaryRepository.listTermsByReflectiveObject(input.userId, input.reflectiveObjectId),
  ]);

  const termsById = new Map(glossaryTerms.map((term) => [term.id, term]));
  const glossaryItems = uniqueGlossaryItems([
    ...glossaryCandidates.map((candidate) => toCandidateItem(candidate, termsById)),
    ...savedTerms.map(toSavedEntityItem),
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
