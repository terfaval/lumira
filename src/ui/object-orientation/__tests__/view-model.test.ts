import { describe, expect, it } from "vitest";

import {
  countOpeningsByState,
  filterOrientationOpenings,
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
});
