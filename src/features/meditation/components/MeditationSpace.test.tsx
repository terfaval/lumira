import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MeditationSpace from "@/src/features/meditation/components/MeditationSpace";
import type { Meditation } from "@/src/features/meditation/lib/meditation-types";

const meditation: Meditation = {
  id: "meditation-1",
  title: "Csend kapuja",
  category: "FOK",
  level: 1,
  meditation_mode: "kontemplativ",
  order_in_category: 1,
  duration_sec: 180,
  summary_short: "Rövid belépés a figyelembe.",
  tone: ["soft"],
  techniques: ["legzes"],
  visual_theme: "default",
  status: "optimalizalt",
  is_published: true,
  campaign_key: null,
  source_docx: "source.docx",
  reader: {
    autoplay: true,
    end_behavior: "soft_end",
    blocks: [{ type: "text", content: "Figyeld a légzést.", tone: "soft" }],
  },
};

describe("MeditationSpace", () => {
  it("renders the center focus prompt before a meditation is selected", () => {
    const markup = renderToStaticMarkup(
      <MeditationSpace meditations={[meditation]} audioMap={{ version: "1", items: {} }} />
    );

    expect(markup).toContain("Engedd, hogy a figyelmed lassan megálljon.");
    expect(markup).toContain("Érints meg egy gyöngyöt.");
  });
});
