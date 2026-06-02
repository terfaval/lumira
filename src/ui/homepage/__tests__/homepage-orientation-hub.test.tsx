import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HomepageOrientationHub } from "@/src/ui/homepage/homepage-orientation-hub";
import type { HomepageOrientationPayload } from "@/src/reflective-space/composition/compose-homepage-orientation-payload";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children?: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const payload: HomepageOrientationPayload = {
  mode: "orientation_home",
  generatedAt: "2026-06-02T08:00:00.000Z",
  contractVersion: "v1",
  capture: {
    title: "Capture",
    description: "You can begin with a dream whenever it feels right.",
    supportedObjectTypes: ["dream", "memory", "journal_entry", "reflective_note"],
    defaultObjectType: "dream",
    target: { targetKey: "capture_home", href: "/capture", routeStatus: "implemented" },
  },
  glossaryPreview: {
    title: "Glossary Memory",
    targetSlots: 5,
    items: [],
    hasMore: false,
  },
  recentObjectsPreview: {
    title: "Recent Objects",
    maxSlots: 3,
    items: [],
    hasMore: false,
  },
  dreamJournalPreview: {
    title: "Dream Journal",
    targetSlots: 3,
    items: [],
    hasMore: false,
  },
  guidePreview: {
    title: "Guide",
    description: "Quiet references for sleep and dream practice.",
    topics: [],
    target: { targetKey: "guide_home", href: "/guide", routeStatus: "placeholder" },
    source: "static_v1",
  },
  navigation: {
    capture: { targetKey: "capture_home", href: "/capture", routeStatus: "implemented" },
    glossary: { targetKey: "glossary_home", href: "/glossary", routeStatus: "placeholder" },
    dreamJournal: { targetKey: "dream_journal_home", href: "/journal", routeStatus: "placeholder" },
    guide: { targetKey: "guide_home", href: "/guide", routeStatus: "placeholder" },
  },
  emptyStates: {
    noDreams: "No dreams are stored yet. You can capture one whenever it feels right.",
    noGlossaryTerms: "Glossary memory will grow as motifs return over time.",
    noRecentObjects: "No active reflective objects yet.",
    noPreviewText: "A short preview is not available yet.",
    guideUnavailable: "Guide space is being prepared.",
  },
  guardrails: {
    noFeed: true,
    fixedPreviewCounts: {
      glossaryTargetSlots: 5,
      dreamJournalTargetSlots: 3,
      recentObjectsMaxSlots: 3,
    },
  },
};

describe("HomepageOrientationHub capture surface", () => {
  it("renders a single capture CTA row without the old eyebrow or heading pattern", () => {
    const markup = renderToStaticMarkup(<HomepageOrientationHub payload={payload} />);

    expect(markup).not.toContain("Belépési felület");
    expect(markup).toContain("Új álom rögzítése");
    expect(markup).toContain(">+</span>");
    expect(markup).toContain("Rögzítsd az álmot, amíg még élénken jelen van.");
    expect(markup).toContain("Néhány mondat is elegendő a kezdéshez.");
    expect(markup).not.toContain("<h2>Új álom rögzítése</h2>");
  });
});
