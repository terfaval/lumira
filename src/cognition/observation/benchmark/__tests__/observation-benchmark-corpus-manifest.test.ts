import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  buildObservationBenchmarkCorpusManifest,
  checkObservationBenchmarkCorpusManifest,
  renderObservationBenchmarkCorpusManifest,
  writeObservationBenchmarkCorpusManifest,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-manifest";
import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";

function buildCorpusForManifest(dreamText = "First line.\n\nSecond paragraph."): string {
  return [
    "# Observation Benchmark Dream Corpus v1",
    "",
    "## Purpose",
    "",
    "Synthetic test corpus.",
    "",
    "# Benchmark Entries",
    "",
    "## OBS-A-001",
    "",
    "**Source Date**",
    "",
    "2026-01-01",
    "",
    "**Benchmark Family**",
    "",
    "A — Synthetic Test Dream",
    "",
    "**Stress Targets**",
    "",
    "- target-a",
    "- target-b",
    "",
    "**Secondary Tags**",
    "",
    "- tag-a",
    "- tag-b",
    "",
    "**Expected Evaluation Focus**",
    "",
    "Focus paragraph.",
    "",
    "**Dream Text**",
    "",
    dreamText,
    "",
    "---",
    "",
    "## OBS-A-002",
    "",
    "**Source Date**",
    "",
    "2026-01-02",
    "",
    "**Benchmark Family**",
    "",
    "A — Synthetic Test Dream",
    "",
    "**Stress Targets**",
    "",
    "- target-c",
    "",
    "**Secondary Tags**",
    "",
    "- tag-c",
    "",
    "**Expected Evaluation Focus**",
    "",
    "Second focus paragraph.",
    "",
    "**Dream Text**",
    "",
    "Another dream.",
    "",
    "---",
    "",
  ].join("\n");
}

describe("observation benchmark corpus manifest", () => {
  let tempDir: string;
  let sourcePath: string;
  let manifestPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "observation-benchmark-manifest-"));
    sourcePath = path.join(tempDir, "Observation-Benchmark-Dream-Corpus-v1.md");
    manifestPath = path.join(tempDir, "Observation-Benchmark-Corpus-Manifest-v1.json");
    await fs.writeFile(sourcePath, buildCorpusForManifest(), "utf8");
  });

  it("builds deterministic manifest output for the same source", async () => {
    const first = await buildObservationBenchmarkCorpusManifest({
      sourcePath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });
    const second = await buildObservationBenchmarkCorpusManifest({
      sourcePath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });

    expect(first.manifest).toEqual(second.manifest);
    expect(renderObservationBenchmarkCorpusManifest(first.manifest)).toBe(
      renderObservationBenchmarkCorpusManifest(second.manifest),
    );
  });

  it("detects source hash changes in check mode", async () => {
    await writeObservationBenchmarkCorpusManifest({
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });

    await fs.writeFile(sourcePath, buildCorpusForManifest("Changed dream text."), "utf8");

    await expect(
      checkObservationBenchmarkCorpusManifest({
        sourcePath,
        manifestPath,
        expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      }),
    ).rejects.toThrow(/stale/i);
  });

  it("detects item text hash changes", async () => {
    const first = await buildObservationBenchmarkCorpusManifest({
      sourcePath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });
    await fs.writeFile(sourcePath, buildCorpusForManifest("Changed dream text."), "utf8");
    const second = await buildObservationBenchmarkCorpusManifest({
      sourcePath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });

    expect(first.manifest.items[0]?.dreamTextHash).not.toBe(second.manifest.items[0]?.dreamTextHash);
  });

  it("fails check mode when the committed manifest is stale", async () => {
    await writeObservationBenchmarkCorpusManifest({
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });

    const committed = await fs.readFile(manifestPath, "utf8");
    await fs.writeFile(manifestPath, committed.replace("\"benchmarkCount\": 2", "\"benchmarkCount\": 99"), "utf8");

    await expect(
      checkObservationBenchmarkCorpusManifest({
        sourcePath,
        manifestPath,
        expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      }),
    ).rejects.toThrow(/stale/i);
  });

  it("writes manifest items without duplicating full dream text", async () => {
    const { manifest } = await writeObservationBenchmarkCorpusManifest({
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });
    const manifestJson = await fs.readFile(manifestPath, "utf8");

    expect(manifest.benchmarkCount).toBe(2);
    expect(manifestJson).not.toContain("First line.");
    expect(manifest.items[0]?.dreamTextByteLength).toBeGreaterThan(0);
    expect(manifest.items[0]?.dreamTextCharacterLength).toBeGreaterThan(0);
  });

  it("builds a real-authority manifest with the current 17-item corpus", async () => {
    await expect(
      buildObservationBenchmarkCorpusManifest({
        sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
        expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        benchmarkCount: 17,
      }),
    );
  });
});
