import { describe, expect, it } from "vitest";

import {
  reconcileEvidenceToSource,
  type GroundingScope,
} from "@/src/cognition/observation-v3/grounding/grounding-reconciliation";

function scope(start: number, end: number): GroundingScope {
  return { start, end };
}

describe("grounding reconciliation", () => {
  it("accepts exact coordinates when they already match the source", () => {
    const sourceText = "A guide leads the dreamer up a staircase.";
    const snippet = "guide leads";
    const start = sourceText.indexOf(snippet);

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet,
        spanStart: start,
        spanEnd: start + snippet.length,
        contextLabel: "quoted_support",
      },
    });

    expect(result).toMatchObject({
      status: "grounded_certain",
      evidence: {
        snippet,
        spanStart: start,
        spanEnd: start + snippet.length,
      },
    });
  });

  it("reconciles wrong coordinates through a unique exact snippet in the allowed scope", () => {
    const sourceText = "Opening scene. Then she turns toward me and we start kissing. Ending scene.";
    const snippet = "Then she turns toward me and we start kissing.";
    const start = sourceText.indexOf(snippet);

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet,
        spanStart: 0,
        spanEnd: snippet.length,
        contextLabel: "window",
      },
    });

    expect(result).toMatchObject({
      status: "grounded_certain",
      evidence: {
        snippet,
        spanStart: start,
        spanEnd: start + snippet.length,
      },
    });
  });

  it("disambiguates duplicate snippets deterministically inside an allowed scope", () => {
    const snippet = "Repeated line appears here.";
    const sourceText = [
      "Intro material.",
      snippet,
      "Separator.",
      snippet,
      "Ending.",
    ].join(" ");
    const secondStart = sourceText.lastIndexOf(snippet);

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet,
        spanStart: 0,
        spanEnd: snippet.length,
        contextLabel: "window",
      },
      allowedScope: scope(secondStart - 12, secondStart + snippet.length + 12),
    });

    expect(result).toMatchObject({
      status: "grounded_certain",
      evidence: {
        snippet,
        spanStart: secondStart,
        spanEnd: secondStart + snippet.length,
      },
    });
  });

  it("returns geometry_failed_but_locally_attributable when duplicate snippets remain ambiguous inside a bounded scope", () => {
    const snippet = "Repeated line appears here.";
    const sourceText = [
      "Intro material.",
      snippet,
      "Separator.",
      snippet,
      "Ending.",
    ].join(" ");
    const firstStart = sourceText.indexOf(snippet);
    const secondStart = sourceText.lastIndexOf(snippet);

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet,
        spanStart: null,
        spanEnd: null,
        contextLabel: "window",
      },
      allowedScope: scope(firstStart, secondStart + snippet.length),
    });

    expect(result).toMatchObject({
      status: "geometry_failed_but_locally_attributable",
      boundedAttribution: {
        start: firstStart,
        end: secondStart + snippet.length,
      },
    });
  });

  it("reconciles safe whitespace, casing, newline, and punctuation variance", () => {
    const sourceText = "The machine whirs loudly.\nEmma leans in close to inspect it.";
    const snippet = "the machine whirs loudly emma leans in close to inspect it";
    const expectedStart = sourceText.indexOf("The machine whirs loudly.");
    const expectedEnd = sourceText.indexOf("it.") + "it.".length;

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet,
        spanStart: null,
        spanEnd: null,
        contextLabel: "quoted_support",
      },
    });

    expect(result).toMatchObject({
      status: "grounded_certain",
      evidence: {
        spanStart: expectedStart,
        spanEnd: expectedEnd,
      },
    });
  });

  it("does not reconcile genuine paraphrase", () => {
    const sourceText = "A guide leads the dreamer up a staircase.";

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet: "Someone escorts the dreamer upstairs.",
        spanStart: null,
        spanEnd: null,
        contextLabel: "quoted_support",
      },
    });

    expect(result).toMatchObject({
      status: "unsupported",
    });
  });

  it("surfaces bounded local attribution when canonical geometry cannot be fixed safely", () => {
    const sourceText = "Intro. Door ajar. Door ajar. Ending.";
    const start = sourceText.indexOf("Door");
    const end = sourceText.lastIndexOf("ajar.") + "ajar.".length;

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet: "Door ajar",
        spanStart: null,
        spanEnd: null,
        contextLabel: "window",
      },
      allowedScope: scope(start, end),
    });

    expect(result).toMatchObject({
      status: "geometry_failed_but_locally_attributable",
      boundedAttribution: {
        start,
        end,
      },
    });
  });

  it("keeps truly unsupported content unsupported", () => {
    const sourceText = "A guide leads the dreamer up a staircase.";

    const result = reconcileEvidenceToSource({
      sourceText,
      evidence: {
        snippet: "This snippet does not exist.",
        spanStart: 0,
        spanEnd: 27,
        contextLabel: "window",
      },
    });

    expect(result).toMatchObject({
      status: "unsupported",
    });
  });
});
