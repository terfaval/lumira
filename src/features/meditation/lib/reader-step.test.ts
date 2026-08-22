import { describe, expect, it } from "vitest";

import { getReaderStep } from "@/src/features/meditation/lib/reader-step";
import type { ReaderTextBlock } from "@/src/features/meditation/lib/meditation-types";

describe("getReaderStep", () => {
  it("keeps the previous text visible while a pause block is active", () => {
    const previousText: ReaderTextBlock = {
      type: "text",
      content: "Első mondat",
      tone: "soft",
    };

    const step = getReaderStep(
      [
        previousText,
        { type: "pause", duration_ms: 1000 },
        { type: "text", content: "Második mondat", tone: "soft" },
      ],
      1,
      previousText
    );

    expect(step).toEqual({
      kind: "pause",
      currentBlockIndex: 1,
      currentText: previousText,
      durationMs: 1000,
    });
  });
});
