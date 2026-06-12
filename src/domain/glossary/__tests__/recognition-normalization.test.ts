import { describe, expect, it } from "vitest";

import {
  cleanGlossaryDisplayText,
  normalizeGlossaryRecognitionText,
} from "@/src/domain/glossary/recognition-normalization";

describe("glossary recognition normalization", () => {
  it("normalizes accents and case into the same recognition key", () => {
    expect(normalizeGlossaryRecognitionText("Kozmó")).toBe("kozmo");
    expect(normalizeGlossaryRecognitionText("Kozmo")).toBe("kozmo");
    expect(normalizeGlossaryRecognitionText("Dóri")).toBe("dori");
    expect(normalizeGlossaryRecognitionText("dori")).toBe("dori");
    expect(normalizeGlossaryRecognitionText("Réka")).toBe("reka");
    expect(normalizeGlossaryRecognitionText("reka")).toBe("reka");
  });

  it("normalizes trivial punctuation consistently", () => {
    expect(normalizeGlossaryRecognitionText("Kozmo.")).toBe("kozmo");
    expect(normalizeGlossaryRecognitionText("Kozmo,")).toBe("kozmo");
    expect(normalizeGlossaryRecognitionText("(Kozmo)")).toBe("kozmo");
  });

  it("keeps user-facing display cleanup separate from recognition normalization", () => {
    expect(cleanGlossaryDisplayText("  Kozmó,   ")).toBe("Kozmó,");
  });
});
