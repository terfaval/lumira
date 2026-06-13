import { describe, expect, it } from "vitest";

import {
  countOpeningsByState,
  filterGlossaryPanelItems,
  filterOrientationOpenings,
  orderGlossaryPanelItems,
  type GlossaryPanelItem,
  type OrientationOpeningCard,
} from "@/src/ui/object-orientation/view-model";

const cards: OrientationOpeningCard[] = [
  {
    id: "opening-new",
    title: "A new opening",
    tone: "gentle",
    kind: "continuity_noticing",
    state: "new",
    ctaLabel: "Begin in Deep Reflection",
    href: "/objects/obj-1/reflect",
  },
  {
    id: "opening-active",
    title: "An active opening",
    tone: "curious",
    kind: "reflective_question",
    state: "active",
    ctaLabel: "Continue in Deep Reflection",
    href: "/objects/obj-1/reflect",
  },
  {
    id: "opening-dormant",
    title: "A dormant opening",
    tone: "calm",
    kind: "reflective_recall",
    state: "dormant",
    ctaLabel: "Re-enter in Deep Reflection",
    href: "/objects/obj-1/reflect",
  },
];

describe("object orientation view model", () => {
  it("counts openings across orientation states and all items", () => {
    expect(countOpeningsByState(cards)).toEqual({
      new: 1,
      active: 1,
      dormant: 1,
      all: 3,
    });
  });

  it("filters openings for stack views and thread overview state clicks", () => {
    expect(filterOrientationOpenings(cards, "new").map((item) => item.id)).toEqual(["opening-new"]);
    expect(filterOrientationOpenings(cards, "active").map((item) => item.id)).toEqual(["opening-active"]);
    expect(filterOrientationOpenings(cards, "dormant").map((item) => item.id)).toEqual(["opening-dormant"]);
    expect(filterOrientationOpenings(cards, "all").map((item) => item.id)).toEqual([
      "opening-new",
      "opening-active",
      "opening-dormant",
    ]);
  });

  it("orders glossary panel items into the required unified sequence", () => {
    const items: GlossaryPanelItem[] = [
      {
        id: "match-role-1",
        kind: "candidate",
        candidateId: "cand-match-role-1",
        candidateClass: "match_candidate",
        candidateState: "candidate",
        label: "Aardvark Role",
        canonicalLabel: "Aardvark Role",
        entityType: "role",
        sourceCategory: "actor",
        recurrenceCount: 1,
        status: "match",
        proposedEntities: [],
        href: null,
      },
      {
        id: "saved-1",
        kind: "saved",
        label: "Bridge",
        canonicalLabel: "Bridge",
        entityType: "place",
        sourceCategory: "location",
        recurrenceCount: null,
        status: "saved",
        proposedEntities: [],
        href: null,
      },
      {
        id: "new-1",
        kind: "candidate",
        candidateId: "cand-new-1",
        candidateClass: "new_candidate",
        candidateState: "candidate",
        label: "Mammut",
        canonicalLabel: "Mammut",
        entityType: "object",
        sourceCategory: "object",
        recurrenceCount: 1,
        status: "new",
        proposedEntities: [],
        href: null,
      },
      {
        id: "new-concept-1",
        kind: "candidate",
        candidateId: "cand-new-concept-1",
        candidateClass: "new_candidate",
        candidateState: "candidate",
        label: "Artifact",
        canonicalLabel: "Artifact",
        entityType: "concept",
        sourceCategory: "emotion",
        recurrenceCount: 1,
        status: "new",
        proposedEntities: [],
        href: null,
      },
      {
        id: "ambiguous-1",
        kind: "candidate",
        candidateId: "cand-ambiguous-1",
        candidateClass: "ambiguous_match_candidate",
        candidateState: "candidate",
        label: "Exem",
        canonicalLabel: "Exem",
        entityType: "role",
        sourceCategory: "actor",
        recurrenceCount: 1,
        status: "ambiguous",
        proposedEntities: [],
        href: null,
      },
      {
        id: "match-1",
        kind: "candidate",
        candidateId: "cand-match-1",
        candidateClass: "match_candidate",
        candidateState: "candidate",
        label: "Apa",
        canonicalLabel: "Apa",
        entityType: "person",
        sourceCategory: "actor",
        recurrenceCount: 2,
        status: "match",
        proposedEntities: [],
        href: null,
      },
    ];

    expect(orderGlossaryPanelItems(items).map((item) => item.id)).toEqual([
      "match-1",
      "match-role-1",
      "ambiguous-1",
      "new-1",
      "new-concept-1",
      "saved-1",
    ]);
  });

  it("filters glossary panel items by visibility only", () => {
    const items: GlossaryPanelItem[] = [
      {
        id: "match-1",
        kind: "candidate",
        candidateId: "cand-match-1",
        candidateClass: "match_candidate",
        candidateState: "candidate",
        label: "Apa",
        canonicalLabel: "Apa",
        entityType: "person",
        sourceCategory: "actor",
        recurrenceCount: 2,
        status: "match",
        proposedEntities: [],
        href: null,
      },
      {
        id: "ignored-new-1",
        kind: "candidate",
        candidateId: "cand-ignored-1",
        candidateClass: "new_candidate",
        candidateState: "ignored",
        label: "Mammut",
        canonicalLabel: "Mammut",
        entityType: "object",
        sourceCategory: "object",
        recurrenceCount: 1,
        status: "new",
        proposedEntities: [],
        href: null,
      },
      {
        id: "saved-1",
        kind: "saved",
        label: "Bridge",
        canonicalLabel: "Bridge",
        entityType: "place",
        sourceCategory: "location",
        recurrenceCount: null,
        status: "saved",
        proposedEntities: [],
        href: null,
      },
    ];

    expect(filterGlossaryPanelItems(items, "all").map((item) => item.id)).toEqual([
      "match-1",
      "ignored-new-1",
      "saved-1",
    ]);
    expect(filterGlossaryPanelItems(items, "pending").map((item) => item.id)).toEqual(["match-1"]);
    expect(filterGlossaryPanelItems(items, "matches").map((item) => item.id)).toEqual(["match-1"]);
    expect(filterGlossaryPanelItems(items, "ambiguous")).toEqual([]);
    expect(filterGlossaryPanelItems(items, "new")).toEqual([]);
    expect(filterGlossaryPanelItems(items, "saved").map((item) => item.id)).toEqual(["saved-1"]);
  });
});
