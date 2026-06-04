import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ObjectOrientationLayer } from "@/src/ui/object-orientation/object-orientation-layer";
import type { ObjectOrientationPayload } from "@/src/reflective-space/composition/compose-object-orientation-payload";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children?: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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
        label: "House",
        category: "location",
        detail: "location • 3 returns",
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
  it("renders the bounded orientation landscape with compact Hungarian panel labels", () => {
    const markup = renderToStaticMarkup(<ObjectOrientationLayer payload={payload} />);

    expect(markup).toContain("Álom");
    expect(markup).toContain("Álomszótár");
    expect(markup).toContain("Jelzések");
    expect(markup).toContain("Érzelmi tér");
    expect(markup).toContain("Szálak");
    expect(markup).toContain("Megnyitások");
    expect(markup).toContain("Jegyzetek");
    expect(markup).toContain("Lantern House");
    expect(markup).toContain("Szerkesztés");
    expect(markup).toContain("aria-pressed=\"true\">Új");
    expect(markup).toContain("The doorway may matter here.");
    expect(markup).toContain("/objects/obj-1/reflect");
  });
});
