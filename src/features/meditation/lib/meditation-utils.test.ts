import { describe, expect, it } from "vitest";

import { replaceMeditationReaderBlocks } from "./meditation-utils";
import type { Meditation, ReaderBlock } from "./meditation-types";

const baseMeditation: Meditation = {
  id: "meditation-1",
  title: "Csend kapuja",
  category: "FOK",
  level: 1,
  meditation_mode: "kontemplativ",
  order_in_category: 1,
  duration_sec: 180,
  summary_short: "Rovid belepes.",
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
    blocks: [{ type: "text", content: "Elso valtozat", tone: "soft" }],
  },
};

describe("replaceMeditationReaderBlocks", () => {
  it("replaces reader blocks for the matching meditation id and preserves the rest", () => {
    const secondMeditation: Meditation = {
      ...baseMeditation,
      id: "meditation-2",
      title: "Masik",
    };
    const nextBlocks: ReaderBlock[] = [
      { type: "text", content: "Mentett valtozat", tone: "deep" },
      { type: "pause", duration_ms: 1500 },
    ];

    const result = replaceMeditationReaderBlocks([baseMeditation, secondMeditation], "meditation-1", nextBlocks);

    expect(result[0].reader.blocks).toEqual(nextBlocks);
    expect(result[1]).toBe(secondMeditation);
    expect(result[0]).not.toBe(baseMeditation);
  });
});
