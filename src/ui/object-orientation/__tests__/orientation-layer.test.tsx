import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ObjectOrientationPayload } from "@/src/reflective-space/composition/compose-object-orientation-payload";
import { ObjectOrientationLayer } from "@/src/ui/object-orientation/object-orientation-layer";

const payload: ObjectOrientationPayload = {
  dream: {
    id: "obj-1",
    title: "Lantern House",
    preview: "I was inside a house with water under the floorboards.",
    editHref: "/objects/obj-1/reflect",
  },
  glossary: {
    items: [
      {
        id: "cand-match-1",
        kind: "candidate",
        candidateId: "cand-match-1",
        candidateClass: "match_candidate",
        candidateState: "candidate",
        label: "Apa",
        canonicalLabel: "Apa",
        entityType: "person",
        sourceCategory: "actor",
        recurrenceCount: 3,
        status: "match",
        proposedEntities: [
          {
            id: "term-1",
            canonicalLabel: "Apa",
            type: "person",
            appearanceCount: 4,
            generalNote: "Recurring father figure.",
          },
        ],
        href: null,
      },
      {
        id: "cand-ambiguous-1",
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
        proposedEntities: [
          {
            id: "term-2",
            canonicalLabel: "Dori",
            type: "person",
            appearanceCount: 1,
            generalNote: null,
          },
        ],
        href: null,
      },
      {
        id: "cand-new-1",
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
    ],
  },
  openingStack: {
    items: [
      {
        id: "opening-new",
        title: "The doorway may matter here.",
        tone: "gentle",
        kind: "continuity_noticing",
        state: "new",
        ctaLabel: "Begin in Deep Reflection",
        href: "/objects/obj-1/reflect",
      },
    ],
    counts: {
      new: 1,
      active: 0,
      dormant: 0,
      all: 1,
    },
    defaultView: "new",
  },
  threadOverview: [
    { state: "new", count: 1 },
    { state: "active", count: 0 },
    { state: "dormant", count: 0 },
  ],
};

describe("ObjectOrientationLayer", () => {
  it("renders the glossary orientation panel within the existing quiet layout", () => {
    const markup = renderToStaticMarkup(<ObjectOrientationLayer payload={payload} />);

    expect(markup).not.toContain(">Álom<");
    expect(markup).toContain("Álomszótár");
    expect(markup).toContain("Apa");
    expect(markup).toContain("Exem");
    expect(markup).toContain("Mammut");
    expect(markup).toContain("Bridge");
    expect(markup).toContain("Szűrő");
    expect(markup).toContain("Jelzések");
    expect(markup).toContain("Érzelmi tér");
    expect(markup).toContain("Szálak");
    expect(markup).toContain("Megnyitások");
    expect(markup).toContain("Jegyzetek");
    expect(markup).toContain("Lantern House");
    expect(markup).toContain("aria-label=\"Cím szerkesztése\"");
    expect(markup).toContain("aria-hidden=\"true\"");
    expect(markup).not.toContain("Átnevezés");
    expect(markup).not.toContain("Bármikor átnevezheted.");
    expect(markup).toContain("aria-pressed=\"true\">Új");
    expect(markup).toContain("The doorway may matter here.");
  });
});
