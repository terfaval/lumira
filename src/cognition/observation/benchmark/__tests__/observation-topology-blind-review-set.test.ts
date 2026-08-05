import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { writeJsonAtomic } from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import { generateObservationTopologyBlindReviewSet } from "@/src/cognition/observation/benchmark/observation-topology-blind-review-set";

async function seedRunDirectory(input: {
  runId: string;
  benchmarkId: string;
  repeatIndex: number;
  configurationId: "A_CURRENT_BASELINE" | "C_TARGETED_RECOVERY";
  sourceRoot: string;
  candidateArtifact: Record<string, unknown>;
}): Promise<string> {
  const runDirectory = path.join(input.sourceRoot, input.runId);
  await fs.mkdir(path.join(runDirectory, "blind-review", "candidates"), { recursive: true });

  const candidateArtifactRef = path.join("blind-review", "candidates", `${input.runId}.json`);
  await writeJsonAtomic(path.join(runDirectory, candidateArtifactRef), input.candidateArtifact);
  await writeJsonAtomic(path.join(runDirectory, "blind-review-index.json"), [{
    benchmarkId: input.benchmarkId,
    repeatIndex: input.repeatIndex,
    candidateLabel: "Candidate X",
    candidateArtifactRef,
    candidateHash: `${input.configurationId === "A_CURRENT_BASELINE" ? "hash-a" : "hash-c"}-${input.repeatIndex}`,
  }]);
  await writeJsonAtomic(path.join(runDirectory, "blind-review-anonymization-map.json"), {
    [`${input.benchmarkId}:${input.repeatIndex}:${input.configurationId}`]: {
      candidateLabel: "Candidate X",
      configurationId: input.configurationId,
    },
  });

  return runDirectory;
}

describe("generateObservationTopologyBlindReviewSet", () => {
  it("creates an identity-safe public blind index for cross-run comparison sets", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-review-source-"));
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-review-output-"));
    const baselineRun = await seedRunDirectory({
      runId: "20260730T171751Z-baseline",
      benchmarkId: "OBS-A-002",
      repeatIndex: 1,
      configurationId: "A_CURRENT_BASELINE",
      sourceRoot,
      candidateArtifact: { kind: "scene_bundle", bundle: { scenes: [] } },
    });
    const refinedRun = await seedRunDirectory({
      runId: "20260730T172127Z-refined",
      benchmarkId: "OBS-A-002",
      repeatIndex: 1,
      configurationId: "C_TARGETED_RECOVERY",
      sourceRoot,
      candidateArtifact: { kind: "scene_bundle", bundle: { scenes: [{ sceneId: "scene-1" }] } },
    });

    const result = await generateObservationTopologyBlindReviewSet({
      outputRoot,
      spec: {
        reviewLabel: "subset-1-repair-review",
        benchmarks: [{
          benchmarkId: "OBS-A-002",
          candidateSources: [
            {
              runDirectory: baselineRun,
              benchmarkId: "OBS-A-002",
              repeatIndex: 1,
              configurationId: "A_CURRENT_BASELINE",
              comparatorLabel: "baseline_a",
            },
            {
              runDirectory: refinedRun,
              benchmarkId: "OBS-A-002",
              repeatIndex: 1,
              configurationId: "C_TARGETED_RECOVERY",
              comparatorLabel: "repaired_refined_c",
            },
          ],
        }],
      },
    });

    const publicIndex = JSON.parse(
      await fs.readFile(path.join(result.reviewSetDirectory, "blind-review-index.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const privateMap = JSON.parse(
      await fs.readFile(path.join(result.reviewSetDirectory, "blind-review-anonymization-map.json"), "utf8"),
    ) as Record<string, unknown>;
    const publicSerialized = JSON.stringify(publicIndex);

    expect(publicIndex).toHaveLength(2);
    expect(publicIndex[0]).toEqual({
      benchmarkId: "OBS-A-002",
      candidateLabel: expect.any(String),
      candidateArtifactRef: expect.any(String),
      candidateHash: expect.any(String),
    });
    expect(publicSerialized).not.toContain("A_CURRENT_BASELINE");
    expect(publicSerialized).not.toContain("C_TARGETED_RECOVERY");
    expect(publicSerialized).not.toContain("baseline");
    expect(publicSerialized).not.toContain("refined");
    expect(publicSerialized).not.toContain("blind-review-anonymization-map");
    expect(Object.keys(privateMap)).toHaveLength(2);
  });
});
