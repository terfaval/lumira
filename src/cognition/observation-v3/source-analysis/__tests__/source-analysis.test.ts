import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  analyzeSourceText,
  runShadowSourceAnalysis,
  SOURCE_ANALYSIS_SCHEMA_VERSION,
  SOURCE_ANALYZER_VERSION,
} from "@/src/cognition/observation-v3/source-analysis";

describe("observation v3 source analysis", () => {
  it("generates deterministic profiles for identical input", () => {
    const dreamText =
      "I was in a railway station.\nThen I was suddenly underwater.\nLater I woke up inside another room.";

    const first = analyzeSourceText({ dreamText });
    const second = analyzeSourceText({ dreamText });

    expect(first).toEqual(second);
  });

  it("profiles whitespace-only input without fabricating descriptive meaning", () => {
    const profile = analyzeSourceText({
      dreamText: "   \n\t  ",
    });

    expect(profile.sourceMetrics.characterCount).toBe(7);
    expect(profile.sourceMetrics.nonWhitespaceCharacterCount).toBe(0);
    expect(profile.structuralCharacteristics.isWhitespaceOnly).toBe(true);
    expect(profile.continuityCharacteristics.transitionCueCount).toBe(0);
    expect(profile.ambiguityCharacteristics.uncertaintyCueCount).toBe(0);
    expect(profile.extractionRiskProfile.overallRisk).toBe("low");
  });

  it("profiles long fragmented unicode input and raises fragmentation risk deterministically", () => {
    const dreamText = [
      "Anyám kint állt a folyosón.",
      "",
      "- aztán mintha máshol lettem volna",
      "",
      "??",
      "",
      "Then I was in a city again, and later, after that, I woke inside another dream.",
    ].join("\n");

    const profile = analyzeSourceText({ dreamText });

    expect(profile.sourceMetrics.lineCount).toBeGreaterThan(4);
    expect(profile.structuralCharacteristics.hasParagraphBreaks).toBe(true);
    expect(profile.structuralCharacteristics.containsNonAscii).toBe(true);
    expect(profile.continuityCharacteristics.fragmentationSignalCount).toBeGreaterThan(0);
    expect(profile.extractionRiskProfile.fragmentationRisk).not.toBe("low");
  });

  it("isolates analyzer failures in shadow mode and reports unavailable status", async () => {
    const result = await runShadowSourceAnalysis({
      dreamText: "I keep losing the thread of the dream.",
      analyzer: () => {
        throw new Error("synthetic_source_analysis_failure");
      },
      now: () => new Date("2026-08-01T10:00:00.000Z"),
    });

    expect(result).toEqual({
      schemaVersion: SOURCE_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: SOURCE_ANALYZER_VERSION,
      generatedAt: "2026-08-01T10:00:00.000Z",
      elapsedMs: expect.any(Number),
      status: "unavailable",
      failure: {
        code: "analyzer_failed",
        message: "synthetic_source_analysis_failure",
      },
    });
  });

  it("keeps source-analysis dependencies bounded away from later subsystems", async () => {
    const sourceAnalysisDirectory = path.resolve("src/cognition/observation-v3/source-analysis");
    const fileNames = await fs.readdir(sourceAnalysisDirectory);
    const sourceFiles = fileNames.filter((fileName) => fileName.endsWith(".ts") && !fileName.endsWith(".test.ts"));

    const contents = await Promise.all(
      sourceFiles.map(async (fileName) => {
        const absolutePath = path.join(sourceAnalysisDirectory, fileName);
        return fs.readFile(absolutePath, "utf8");
      }),
    );

    for (const source of contents) {
      expect(source).not.toMatch(/observation\/llm-/);
      expect(source).not.toMatch(/observation-v3\/recovery/);
      expect(source).not.toMatch(/observation-v3\/reconciliation/);
      expect(source).not.toMatch(/observation-v3\/memory-realization/);
      expect(source).not.toMatch(/observation-v3\/authority-admission/);
      expect(source).not.toMatch(/downstream/i);
    }
  });
});
