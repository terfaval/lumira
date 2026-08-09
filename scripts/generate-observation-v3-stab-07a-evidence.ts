import fs from "node:fs/promises";
import path from "node:path";

import {
  projectNativeC0CandidateToObservationV2Bundle,
  type ObservationV3NativeC0Candidate,
} from "@/src/cognition/observation-v3/descriptive-extraction";
import { runObservationV3ShadowPipeline } from "@/src/cognition/observation-v3/pipeline";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortForJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForJson(entry)]),
    );
  }

  return value;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(sortForJson(value), null, 2)}\n`, "utf8");
}

function buildRecoverableReplay() {
  const dreamText = "The dreamer enters a city. Later the dreamer finds a hidden garden and wakes.";
  return {
    dreamText,
    replay: {
      adapterId: "preserved-replay-adapter-v1",
      descriptiveExtraction: {
        attemptId: "attempt-01",
        attemptNumber: 1 as const,
        sourceArtifactRef: "fixtures/recoverable-attempt-01.json",
        providerResult: {
          outputText: JSON.stringify({
            dreamLanguage: "en",
            scenes: [
              {
                sceneId: "scene-1",
                position: 0,
                summary: "The dreamer enters a city.",
                boundaryReasoning: [],
                evidenceContext: {
                  snippet: "The dreamer enters a city.",
                  spanStart: 0,
                  spanEnd: 26,
                  contextLabel: "early",
                },
                observations: [
                  {
                    observationId: "obs-1",
                    position: 0,
                    text: "The dreamer enters a city.",
                    evidence: [
                      {
                        snippet: "The dreamer enters a city.",
                        spanStart: 0,
                        spanEnd: 26,
                        contextLabel: "early",
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
        },
      },
      supplementalRealization: {
        responses: [
          {
            physicalGapId: "gap-001",
            sourceArtifactRef: "fixtures/recoverable-supplemental.json",
            providerResult: {
              outputText: JSON.stringify({
                regions: [
                  {
                    regionId: "region-1",
                    heading: "Later",
                    spanStart: 27,
                    spanEnd: dreamText.length,
                    boundaryUncertainty: null,
                    transitionCues: ["later"],
                    observations: [
                      {
                        observationId: "supp-1",
                        statement: "Later the dreamer finds a hidden garden and wakes.",
                        uncertainty: null,
                        evidence: [
                          {
                            snippet: "Later the dreamer finds a hidden garden and wakes.",
                            spanStart: 27,
                            spanEnd: dreamText.length,
                            contextLabel: "late",
                          },
                        ],
                      },
                    ],
                  },
                ],
              }),
              providerStatus: "completed",
              providerIncompleteReason: null,
              tokenUsage: {
                input: 1,
                output: 1,
                total: 2,
              },
            },
          },
        ],
      },
    },
  };
}

async function main() {
  const stabilizationRoot = path.resolve(
    readArg("--stabilization-root")
    ?? ".validation/observation-v3/stabilization/stab-07a/20260809T000000Z-native-c0-isolation",
  );
  const replay = buildRecoverableReplay();
  const pipelineResult = await runObservationV3ShadowPipeline({
    userId: "user-1",
    reflectiveObjectId: "object-1",
    dreamText: replay.dreamText,
    replay: replay.replay,
  });

  const descriptiveExtraction = pipelineResult.stageResults.find((stage) => stage.stage === "descriptive_extraction");
  const completeness = pipelineResult.stageResults.find((stage) => stage.stage === "completeness_analysis");
  const composition = pipelineResult.stageResults.find((stage) => stage.stage === "memory_composition");
  const nativeCandidate = (descriptiveExtraction?.payload as { candidate?: ObservationV3NativeC0Candidate } | undefined)?.candidate;
  const c0Artifact = pipelineResult.artifacts["native-c0-carrier-evidence.json"] as Record<string, unknown> | undefined;

  if (!nativeCandidate || !c0Artifact) {
    throw new Error("native_c0_carrier_evidence_unavailable");
  }

  const projection = projectNativeC0CandidateToObservationV2Bundle(nativeCandidate);
  const artifact = {
    generatedAt: new Date().toISOString(),
    stabilizationRoot,
    pipelineId: pipelineResult.pipelineId,
    nativeCandidateIdentity: {
      candidateId: nativeCandidate.candidateId,
      candidateHash: nativeCandidate.candidateHash,
      candidateVersion: nativeCandidate.candidateVersion,
    },
    initialCompletenessInputIdentity: (completeness?.payload as { candidateIdentity?: unknown } | undefined)?.candidateIdentity ?? null,
    supplementalBaselineIdentity: (c0Artifact.supplementalBaseline as Record<string, unknown> | undefined) ?? null,
    compositionBaselineIdentity: (c0Artifact.compositionBaseline as Record<string, unknown> | undefined) ?? null,
    v2ProjectionIdentity: {
      bundleId: projection.bundleId ?? null,
      runtimeVersion: projection.runtimeVersion ?? null,
    },
    projectionReconsumedByNativePipeline: c0Artifact.projectionReconsumedByNativePipeline ?? null,
    activeShadowPathBaselineCarrier: {
      descriptiveExtractionPrimaryField: "candidate",
      completenessConsumes: "native_c0_candidate",
      supplementalConsumes: "native_c0_candidate",
      compositionConsumes: "native_c0_candidate",
    },
    finalCompletenessIdentity: (composition?.payload as { finalCompleteness?: { candidateIdentity?: unknown } } | undefined)?.finalCompleteness?.candidateIdentity ?? null,
  };

  const outputPath = path.join(stabilizationRoot, "stab-07a-evidence.json");
  await writeJson(outputPath, artifact);
  process.stdout.write(`${outputPath}\n`);
}

void main();
