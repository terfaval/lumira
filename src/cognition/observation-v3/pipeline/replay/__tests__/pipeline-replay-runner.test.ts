import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  discoverObservationV3ReplayRoots,
  loadObservationV3BenchmarkMatrix,
  runObservationV3CorpusReplay,
} from "@/src/cognition/observation-v3/pipeline/replay";
import * as replayPublicApi from "@/src/cognition/observation-v3/pipeline/replay";

const createdDirectories: string[] = [];

async function makeTempDir(label: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));
  createdDirectories.push(directory);
  return directory;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, value: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

function buildCorpusMarkdown(entries: Array<{ benchmarkId: string; dreamText: string }>): string {
  const sections = entries.map(({ benchmarkId, dreamText }) => [
    `## ${benchmarkId}`,
    "",
    "**Source Date**",
    "",
    "2026-01-01",
    "",
    "**Benchmark Family**",
    "",
    "test-family",
    "",
    "**Stress Targets**",
    "",
    "- continuity",
    "",
    "**Secondary Tags**",
    "",
    "- replay",
    "",
    "**Expected Evaluation Focus**",
    "",
    "Replay validation.",
    "",
    "**Dream Text**",
    "",
    dreamText,
    "",
    "---",
  ].join("\n"));

  return [
    "# Observation Benchmark Dream Corpus",
    "",
    "# Benchmark Entries",
    "",
    ...sections,
    "",
  ].join("\n");
}

async function createReplayFixture(): Promise<{
  root: string;
  corpusPath: string;
}> {
  const root = await makeTempDir("obs-v3-replay");
  const corpusPath = path.join(root, "corpus.md");

  await writeText(
    corpusPath,
    buildCorpusMarkdown([
      {
        benchmarkId: "OBS-A-001",
        dreamText: "A guide leads the dreamer up a staircase. Later the dreamer wakes.",
      },
      {
        benchmarkId: "OBS-A-002",
        dreamText: "A market opens and the dreamer walks away.",
      },
    ]),
  );

  const completenessRoot = path.join(
    root,
    ".validation",
    "observation-v3",
    "completeness-calibration",
    "20260802T000000Z-obs-v3-completeness-calibration",
  );
  const benchmarkRunRoot = path.join(completenessRoot, "benchmark-runs");
  const replayableRunDirectory = path.join(benchmarkRunRoot, "20260802T000000Z-aaa-OBS-A-001");
  const incompleteRunDirectory = path.join(benchmarkRunRoot, "20260802T000100Z-bbb-OBS-A-002");

  await writeJson(path.join(completenessRoot, "calibration-summary.json"), {
    generatedAt: "2026-08-02T00:00:00.000Z",
    benchmarkCount: 2,
    repeatCount: 1,
    totalScheduledRuns: 2,
    completedRuns: 2,
    runRecords: [
      {
        benchmarkId: "OBS-A-001",
        repeat: 1,
        runId: "20260802T000000Z-aaa-OBS-A-001",
        artifactDirectory: replayableRunDirectory,
      },
      {
        benchmarkId: "OBS-A-002",
        repeat: 1,
        runId: "20260802T000100Z-bbb-OBS-A-002",
        artifactDirectory: incompleteRunDirectory,
      },
    ],
  });

  await writeJson(path.join(replayableRunDirectory, "items", "OBS-A-001", "item-summary.json"), {
    acceptedAttempt: 1,
  });
  await writeJson(path.join(replayableRunDirectory, "items", "OBS-A-001", "attempts", "attempt-01", "attempt-metadata.json"), {
    attemptNumber: 1,
    providerReturnedStructuredOutput: true,
    rawProviderResponsePreserved: true,
  });
  await writeJson(path.join(replayableRunDirectory, "items", "OBS-A-001", "attempts", "attempt-01", "provider-structured-output.json"), {
    outputText: JSON.stringify({
      dreamLanguage: "en",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "A guide leads the dreamer up a staircase.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "A guide leads the dreamer up a staircase.",
            spanStart: 0,
            spanEnd: 38,
            contextLabel: "scene",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "A guide leads the dreamer up a staircase.",
              evidence: [
                {
                  snippet: "A guide leads the dreamer up a staircase.",
                  spanStart: 0,
                  spanEnd: 38,
                  contextLabel: "scene",
                },
              ],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [],
            locations: [],
            objects: [],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    }),
    providerDiagnostics: {
      elapsedMs: 10,
      providerStatus: "completed",
      providerIncompleteReason: null,
      providerReturnedStructuredOutput: true,
      inputTokenUsage: 1,
      outputTokenUsage: 1,
      totalTokenUsage: 2,
    },
  });
  await writeJson(path.join(replayableRunDirectory, "items", "OBS-A-001", "attempts", "attempt-01", "completeness-report.json"), {
    status: "available",
    report: {
      sourceIdentity: {
        sourceHash: "a-source-hash",
      },
      candidateIdentity: {
        candidateHash: "a-candidate-hash",
      },
      recoveryRecommendation: {
        eligibility: "eligible",
        targetedPhysicalGapIds: ["gap-001"],
      },
    },
  });

  await writeJson(path.join(incompleteRunDirectory, "items", "OBS-A-002", "item-summary.json"), {
    acceptedAttempt: 1,
  });
  await writeJson(path.join(incompleteRunDirectory, "items", "OBS-A-002", "attempts", "attempt-01", "attempt-metadata.json"), {
    attemptNumber: 1,
    providerReturnedStructuredOutput: true,
    rawProviderResponsePreserved: false,
  });
  await writeJson(path.join(incompleteRunDirectory, "items", "OBS-A-002", "attempts", "attempt-01", "candidate-bundle.json"), {
    bundleId: "bundle-obs-a-002",
  });

  const legacyTopologyRoot = path.join(
    root,
    ".validation",
    "observation-topology-experiments",
    "runs",
    "20260801T235900Z-zzz-C_TARGETED_RECOVERY-r1",
  );
  await writeJson(
    path.join(legacyTopologyRoot, "items", "OBS-A-001", "C_TARGETED_RECOVERY", "repeat-01", "stages", "02-recovery_selection.json"),
    {
      status: "success",
      artifact: {
        canonicalGaps: [],
      },
    },
  );

  const topologyRoot = path.join(
    root,
    ".validation",
    "observation-topology-experiments",
    "runs",
    "20260802T000000Z-aaa-C_TARGETED_RECOVERY-r1",
  );

  await writeJson(
    path.join(topologyRoot, "items", "OBS-A-001", "C_TARGETED_RECOVERY", "repeat-01", "stages", "02-recovery_selection.json"),
    {
      status: "success",
      artifact: {
        canonicalGaps: [
          {
            physicalGapId: "gap-001",
          },
        ],
        canonicalRecoveryWindows: [
          {
            physicalGapId: "gap-001",
            targetId: "target-1-gap-001",
            kind: "tail",
            sourceStart: 41,
            sourceEnd: 66,
            contextStart: 0,
            contextEnd: 66,
          },
        ],
      },
    },
  );
  await writeJson(
    path.join(topologyRoot, "items", "OBS-A-001", "C_TARGETED_RECOVERY", "repeat-01", "supplemental-provider-evidence-index.json"),
    [
      {
        requestId: "supp-1",
        targetId: "target-1-gap-001",
        providerAttemptNumber: 1,
        evidenceArtifactRef: path.join("supplemental-provider-evidence", "target-1-gap-001-attempt-01.json"),
      },
    ],
  );
  await writeJson(
    path.join(topologyRoot, "items", "OBS-A-001", "C_TARGETED_RECOVERY", "repeat-01", "supplemental-provider-evidence", "target-1-gap-001-attempt-01.json"),
    {
      subsystem: "supplemental_realization",
      attemptIdentity: {
        targetId: "target-1-gap-001",
        targetExecutionAttempt: 1,
      },
      providerBoundary: {
        sanitizedPayload: {
          outputText: JSON.stringify({
            regions: [
              {
                regionId: "region-1",
                heading: "Later",
                spanStart: 0,
                spanEnd: 24,
                boundaryUncertainty: null,
                transitionCues: ["later"],
                observations: [
                  {
                    observationId: "supp-1",
                    statement: "Later the dreamer wakes.",
                    uncertainty: null,
                    evidence: [
                      {
                        snippet: "Later the dreamer wakes.",
                        spanStart: 0,
                        spanEnd: 24,
                        contextLabel: "late",
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        },
        providerMetadata: {
          providerStatus: "completed",
        },
        tokenUsage: {
          input: 1,
          output: 1,
          total: 2,
        },
      },
      parsing: {
        structuredOutput: {
          regions: [
            {
              regionId: "region-1",
              heading: "Later",
              spanStart: 0,
              spanEnd: 24,
              boundaryUncertainty: null,
              transitionCues: ["later"],
              observations: [
                {
                  observationId: "supp-1",
                  statement: "Later the dreamer wakes.",
                  uncertainty: null,
                  evidence: [
                    {
                      snippet: "Later the dreamer wakes.",
                      spanStart: 0,
                      spanEnd: 24,
                      contextLabel: "late",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  );

  await writeJson(
    path.join(topologyRoot, "items", "OBS-A-002", "C_TARGETED_RECOVERY", "repeat-01", "stages", "02-recovery_selection.json"),
    {
      status: "success",
      artifact: {
        canonicalGaps: [],
      },
    },
  );

  const authorityRoot = path.join(
    root,
    ".validation",
    "observation-v3",
    "authority-admission-shadow",
    "20260802T010000Z-obs-v3-authority-admission-shadow",
  );
  await writeJson(path.join(authorityRoot, "review-manifest.json"), {
    reviewId: "review-1",
  });

  return {
    root,
    corpusPath,
  };
}

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("Observation V3 corpus replay", () => {
  it("exposes only the intended replay runner-facing barrel surface", () => {
    expect("runObservationV3CorpusReplay" in replayPublicApi).toBe(true);
    expect("discoverObservationV3ReplayRoots" in replayPublicApi).toBe(true);
    expect("loadObservationV3BenchmarkMatrix" in replayPublicApi).toBe(true);
    expect("fingerprintObservationV3CorpusReplay" in replayPublicApi).toBe(false);
    expect("buildObservationV3ReplayCaseArtifacts" in replayPublicApi).toBe(false);
  });

  it("discovers replay roots and benchmark matrix entries deterministically", async () => {
    const fixture = await createReplayFixture();

    const discovered = await discoverObservationV3ReplayRoots({
      validationRoot: path.join(fixture.root, ".validation"),
    });

    expect(discovered.completenessRoots).toHaveLength(1);
    expect(discovered.topologyExperimentRoots).toHaveLength(2);
    expect(discovered.authorityAdmissionRoots).toHaveLength(1);

    const matrix = await loadObservationV3BenchmarkMatrix({
      corpusPath: fixture.corpusPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      validationRoot: path.join(fixture.root, ".validation"),
    });

    expect(matrix.cases.map((entry) => entry.benchmarkId)).toEqual(["OBS-A-001", "OBS-A-002"]);
    expect(matrix.discovery.completenessRoots).toEqual(discovered.completenessRoots);
  });

  it("executes replayable cases and classifies incomplete cases without fabricating replay evidence", async () => {
    const fixture = await createReplayFixture();

    const result = await runObservationV3CorpusReplay({
      corpusPath: fixture.corpusPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      validationRoot: path.join(fixture.root, ".validation"),
    });

    const replayable = result.results.find((entry) => entry.benchmarkId === "OBS-A-001");
    const incomplete = result.results.find((entry) => entry.benchmarkId === "OBS-A-002");

    expect(replayable).toMatchObject({
      benchmarkId: "OBS-A-001",
      classification: "fully_replayable",
      executionStatus: "executed",
    });
    expect(replayable?.pipelineResult?.summary).toEqual(expect.objectContaining({
      governanceDisposition: expect.any(String),
      pipelineCompletionStatus: "completed",
    }));
    expect(replayable?.pipelineResult?.stageResults.find((stage) => stage.stage === "descriptive_extraction")).toMatchObject({
      executionMode: "preserved_replay",
      status: "success",
    });
    expect(incomplete).toMatchObject({
      benchmarkId: "OBS-A-002",
      classification: "artifact_incomplete",
      executionStatus: "not_executed",
      failure: {
        classification: "missing_replay_evidence",
      },
    });
  });

  it("fails deterministically on corrupt artifacts", async () => {
    const fixture = await createReplayFixture();
    await writeText(
      path.join(
        fixture.root,
        ".validation",
        "observation-v3",
        "completeness-calibration",
        "20260802T000000Z-obs-v3-completeness-calibration",
        "benchmark-runs",
        "20260802T000000Z-aaa-OBS-A-001",
        "items",
        "OBS-A-001",
        "attempts",
        "attempt-01",
        "provider-structured-output.json",
      ),
      "{not-json",
    );

    const result = await runObservationV3CorpusReplay({
      corpusPath: fixture.corpusPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      validationRoot: path.join(fixture.root, ".validation"),
    });

    expect(result.results.find((entry) => entry.benchmarkId === "OBS-A-001")).toMatchObject({
      classification: "artifact_incomplete",
      executionStatus: "not_executed",
      failure: {
        classification: "corrupt_artifact",
      },
    });
  });

  it("classifies incompatible preserved supplemental replay as replay evidence unavailability rather than native subsystem failure", async () => {
    const fixture = await createReplayFixture();
    await writeJson(
      path.join(
        fixture.root,
        ".validation",
        "observation-topology-experiments",
        "runs",
        "20260802T000000Z-aaa-C_TARGETED_RECOVERY-r1",
        "items",
        "OBS-A-001",
        "C_TARGETED_RECOVERY",
        "repeat-01",
        "stages",
        "02-recovery_selection.json",
      ),
      {
        status: "success",
        artifact: {
          canonicalGaps: [
            {
              physicalGapId: "gap-001",
            },
          ],
          canonicalRecoveryWindows: [
            {
              physicalGapId: "gap-001",
              targetId: "target-1-gap-001",
              kind: "prefix",
              sourceStart: 0,
              sourceEnd: 12,
              contextStart: 0,
              contextEnd: 30,
            },
          ],
        },
      },
    );

    const result = await runObservationV3CorpusReplay({
      corpusPath: fixture.corpusPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      validationRoot: path.join(fixture.root, ".validation"),
    });

    expect(result.results.find((entry) => entry.benchmarkId === "OBS-A-001")).toMatchObject({
      classification: "artifact_incomplete",
      executionStatus: "executed",
      failure: {
        classification: "missing_replay_evidence",
        message: "incompatible_preserved_replay:target-1-gap-001",
      },
    });
  });
});
