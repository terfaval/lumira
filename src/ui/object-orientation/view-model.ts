import type {
  GlossaryCandidateClass,
  GlossaryCandidateState,
  GlossaryEntityType,
} from "@/src/domain/glossary/types";
import type { ObservationCategory } from "@/src/domain/observation/types";
import type { OpeningType, OpeningTone } from "@/src/domain/openings/types";

export type OrientationStackView = "new" | "active" | "dormant" | "all";

export interface OrientationOpeningCard {
  id: string;
  title: string;
  tone: OpeningTone;
  kind: OpeningType;
  state: Exclude<OrientationStackView, "all">;
  ctaLabel: string;
  href: string;
}

export interface GlossaryPanelProposedEntity {
  id: string;
  canonicalLabel: string;
  type: GlossaryEntityType;
  appearanceCount: number;
  generalNote: string | null;
}

type GlossaryPanelStatus = "match" | "ambiguous" | "new" | "saved";

interface GlossaryPanelItemBase {
  id: string;
  label: string;
  canonicalLabel: string;
  entityType: GlossaryEntityType;
  sourceCategory: ObservationCategory | "saved_entity";
  recurrenceCount: number | null;
  status: GlossaryPanelStatus;
  proposedEntities: GlossaryPanelProposedEntity[];
  href: string | null;
}

export interface GlossaryCandidatePanelItem extends GlossaryPanelItemBase {
  kind: "candidate";
  candidateId: string;
  candidateClass: GlossaryCandidateClass;
  candidateState: GlossaryCandidateState;
}

export interface GlossarySavedPanelItem extends GlossaryPanelItemBase {
  kind: "saved";
}

export type GlossaryPanelItem = GlossaryCandidatePanelItem | GlossarySavedPanelItem;

export type GlossaryPanelFilter = "all" | "pending" | "matches" | "ambiguous" | "new" | "saved";

export function countOpeningsByState(items: OrientationOpeningCard[]): Record<OrientationStackView, number> {
  const counts: Record<OrientationStackView, number> = {
    new: 0,
    active: 0,
    dormant: 0,
    all: items.length,
  };

  for (const item of items) {
    counts[item.state] += 1;
  }

  return counts;
}

export function filterOrientationOpenings(
  items: OrientationOpeningCard[],
  view: OrientationStackView,
): OrientationOpeningCard[] {
  if (view === "all") {
    return items;
  }

  return items.filter((item) => item.state === view);
}

const STATUS_ORDER: Record<GlossaryPanelStatus, number> = {
  match: 0,
  ambiguous: 1,
  new: 2,
  saved: 3,
};

const ENTITY_TYPE_ORDER: Record<GlossaryEntityType, number> = {
  person: 0,
  place: 1,
  setting_or_space: 1,
  role: 2,
  object: 3,
  animal_or_creature: 3,
  concept: 4,
};

export function orderGlossaryPanelItems(items: GlossaryPanelItem[]): GlossaryPanelItem[] {
  return [...items].sort((left, right) => {
    const byStatus = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (byStatus !== 0) {
      return byStatus;
    }

    const byEntityType = ENTITY_TYPE_ORDER[left.entityType] - ENTITY_TYPE_ORDER[right.entityType];
    if (byEntityType !== 0) {
      return byEntityType;
    }

    return left.label.localeCompare(right.label, "hu");
  });
}

export function filterGlossaryPanelItems(
  items: GlossaryPanelItem[],
  filter: GlossaryPanelFilter,
): GlossaryPanelItem[] {
  switch (filter) {
    case "pending":
      return items.filter((item) => item.kind === "candidate" && item.candidateState === "candidate");
    case "matches":
      return items.filter((item) => item.status === "match");
    case "ambiguous":
      return items.filter((item) => item.status === "ambiguous");
    case "new":
      return items.filter((item) => item.status === "new" && item.kind === "candidate" && item.candidateState === "candidate");
    case "saved":
      return items.filter((item) => item.status === "saved");
    default:
      return items;
  }
}
