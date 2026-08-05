import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusContent,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";

function buildCorpus(entries: Array<{
  benchmarkId: string;
  sourceDate?: string;
  benchmarkFamily?: string;
  stressTargets?: string[];
  secondaryTags?: string[];
  expectedEvaluationFocus?: string[];
  dreamText?: string;
}>): string {
  const entryBlocks = entries.map((entry) => {
    const stressTargets = (entry.stressTargets ?? ["target-a", "target-b"]).map((value) => `- ${value}`).join("\n");
    const secondaryTags = (entry.secondaryTags ?? ["tag-a", "tag-b"]).map((value) => `- ${value}`).join("\n");
    const expectedEvaluationFocus = (entry.expectedEvaluationFocus ?? ["Focus paragraph."]).join("\n\n");

    return [
      `## ${entry.benchmarkId}`,
      "",
      "**Source Date**",
      "",
      entry.sourceDate ?? "2026-01-01",
      "",
      "**Benchmark Family**",
      "",
      entry.benchmarkFamily ?? "A — Synthetic Test Dream",
      "",
      "**Stress Targets**",
      "",
      stressTargets,
      "",
      "**Secondary Tags**",
      "",
      secondaryTags,
      "",
      "**Expected Evaluation Focus**",
      "",
      expectedEvaluationFocus,
      "",
      "**Dream Text**",
      "",
      entry.dreamText ?? "First line.\n\nSecond paragraph.",
      "",
      "---",
      "",
    ].join("\n");
  });

  return [
    "# Observation Benchmark Dream Corpus v1",
    "",
    "## Purpose",
    "",
    "Synthetic test corpus.",
    "",
    "# Benchmark Entries",
    "",
    ...entryBlocks,
  ].join("\n");
}

describe("parseObservationBenchmarkCorpusContent", () => {
  it("parses multiline dream text exactly while excluding delimiter-adjacent blank lines", () => {
    const content = buildCorpus([
      {
        benchmarkId: "OBS-A-001",
        dreamText: "First line.\nStill same paragraph.\n\nSecond paragraph.\nThird line.",
      },
      {
        benchmarkId: "OBS-A-002",
        dreamText: "Another dream.",
      },
    ]);

    const parsed = parseObservationBenchmarkCorpusContent({
      content,
      sourcePath: "synthetic.md",
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });

    expect(parsed.benchmarkCount).toBe(2);
    expect(parsed.items[0]?.dreamText).toBe("First line.\nStill same paragraph.\n\nSecond paragraph.\nThird line.");
    expect(parsed.items[0]?.dreamText.startsWith("\n")).toBe(false);
    expect(parsed.items[0]?.dreamText.endsWith("\n")).toBe(false);
  });

  it("rejects duplicate benchmark ids", () => {
    const content = buildCorpus([
      { benchmarkId: "OBS-A-001", dreamText: "One." },
      { benchmarkId: "OBS-A-001", dreamText: "Two." },
    ]);

    expect(() =>
      parseObservationBenchmarkCorpusContent({
        content,
        sourcePath: "synthetic.md",
        expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-001"],
      }),
    ).toThrow(/Duplicate benchmark ID/);
  });

  it("rejects missing required fields", () => {
    const content = buildCorpus([{ benchmarkId: "OBS-A-001" }]).replace("**Secondary Tags**\n\n- tag-a\n- tag-b\n\n", "");

    expect(() =>
      parseObservationBenchmarkCorpusContent({
        content,
        sourcePath: "synthetic.md",
        expectedBenchmarkOrder: ["OBS-A-001"],
      }),
    ).toThrow(/Expected field "\*\*Secondary Tags\*\*"/);
  });

  it("rejects empty dream text", () => {
    const content = buildCorpus([{ benchmarkId: "OBS-A-001", dreamText: "" }]);

    expect(() =>
      parseObservationBenchmarkCorpusContent({
        content,
        sourcePath: "synthetic.md",
        expectedBenchmarkOrder: ["OBS-A-001"],
      }),
    ).toThrow(/empty dream text/i);
  });

  it("rejects malformed benchmark headings", () => {
    const content = buildCorpus([{ benchmarkId: "OBS-A-001" }]).replace("## OBS-A-001", "## OBS-A-01");

    expect(() =>
      parseObservationBenchmarkCorpusContent({
        content,
        sourcePath: "synthetic.md",
        expectedBenchmarkOrder: ["OBS-A-001"],
      }),
    ).toThrow(/Malformed benchmark heading/i);
  });
});

describe("parseObservationBenchmarkCorpusFile", () => {
  it("parses the current 17-item authority file in canonical order", async () => {
    const parsed = await parseObservationBenchmarkCorpusFile({
      sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
      expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
    });

    expect(parsed.benchmarkCount).toBe(17);
    expect(parsed.benchmarkOrder).toEqual(OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER);
    expect(parsed.items[0]?.benchmarkId).toBe("OBS-A-001");
    expect(parsed.items.at(-1)?.benchmarkId).toBe("OBS-H-002");
    expect(parsed.items.every((item) => item.dreamText.length > 0)).toBe(true);
    expect(parsed.items[0]?.source.startLine).toBeGreaterThan(0);
    expect(parsed.items[0]?.source.endLine).toBeGreaterThan(parsed.items[0]?.source.startLine ?? 0);
  });

  it("uses the repository authority path constant", () => {
    expect(path.normalize(OBSERVATION_BENCHMARK_CORPUS_V1_PATH)).toBe(
      path.normalize("docs/v2-build/validation-benchmark/Observation-Benchmark-Dream-Corpus-v1.md"),
    );
  });
});
