import { describe, expect, it } from "vitest";

import { countCaptureTextMetrics } from "@/app/capture/capture-metrics";

describe("countCaptureTextMetrics", () => {
  it("counts words from trimmed non-empty segments only", () => {
    expect(countCaptureTextMetrics("  Egy  rövid\nálom  ")).toEqual({
      characterCount: 19,
      wordCount: 3,
    });
  });

  it("returns zero words for whitespace-only input while preserving character count", () => {
    expect(countCaptureTextMetrics(" \n\t ")).toEqual({
      characterCount: 4,
      wordCount: 0,
    });
  });
});
