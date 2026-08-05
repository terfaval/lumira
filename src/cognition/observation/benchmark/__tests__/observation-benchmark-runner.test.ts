import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { writeObservationBenchmarkCorpusManifest } from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-manifest";
import {
  formatObservationBenchmarkRunSummary,
  parseObservationBenchmarkRunCliArgs,
  runObservationBenchmarks,
} from "@/src/cognition/observation/benchmark/observation-benchmark-runner";
import type {
  ObservationBenchmarkFingerprintSet,
  ObservationBenchmarkRepositoryState,
} from "@/src/cognition/observation/benchmark/observation-benchmark-fingerprint";
import type { CompletenessAnalysisShadowResult } from "@/src/cognition/observation-v3/completeness-analysis";
import type { DescriptiveExtractionProviderEvidence } from "@/src/cognition/observation-v3/provider-evidence";
import type { SourceAnalysisShadowResult } from "@/src/cognition/observation-v3/source-analysis";

function buildCorpus(dreamTextById?: Record<string, string>): string {
  const dreamText = {
    "OBS-A-001": "First benchmark dream.",
    "OBS-A-002": "Second benchmark dream.",
    ...dreamTextById,
  };

  return [
    "# Observation Benchmark Dream Corpus v1",
    "",
    "## Purpose",
    "",
    "Synthetic runner test corpus.",
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
    "A - Synthetic Test Dream",
    "",
    "**Stress Targets**",
    "",
    "- target-a",
    "",
    "**Secondary Tags**",
    "",
    "- tag-a",
    "",
    "**Expected Evaluation Focus**",
    "",
    "Focus A.",
    "",
    "**Dream Text**",
    "",
    dreamText["OBS-A-001"],
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
    "A - Synthetic Test Dream",
    "",
    "**Stress Targets**",
    "",
    "- target-b",
    "",
    "**Secondary Tags**",
    "",
    "- tag-b",
    "",
    "**Expected Evaluation Focus**",
    "",
    "Focus B.",
    "",
    "**Dream Text**",
    "",
    dreamText["OBS-A-002"],
    "",
    "---",
    "",
  ].join("\n");
}

function buildBundle(input: {
  reflectiveObjectId: string;
  userId: string;
  sceneCount?: number;
  observationCount?: number;
}): ObservationV2Bundle {
  const observationCount = input.observationCount ?? 2;
  const scenes = Array.from({ length: input.sceneCount ?? 1 }, (_, sceneIndex) => ({
    sceneId: `scene-${sceneIndex + 1}`,
    position: sceneIndex,
    summary: `Scene ${sceneIndex + 1}`,
    boundaryReasoning: [],
    evidenceContext: {
      snippet: `Scene ${sceneIndex + 1} evidence`,
      spanStart: 0,
      spanEnd: 20,
      contextLabel: "scene",
    },
    observations: Array.from({ length: observationCount }, (_, observationIndex) => ({
      observationId: `observation-${sceneIndex + 1}-${observationIndex + 1}`,
      position: observationIndex,
      text: `Observation ${observationIndex + 1}`,
      evidence: [
        {
          snippet: `Observation ${observationIndex + 1} evidence`,
          spanStart: 0,
          spanEnd: 20,
          contextLabel: "quoted_support",
        },
      ],
      uncertaintyNote: null,
    })),
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
  }));

  return {
    bundleId: "bundle-1",
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: "system_llm_extract",
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "en",
    },
    scenes,
  };
}

function buildSourceAnalysisResult(): SourceAnalysisShadowResult {
  return {
    schemaVersion: "1",
    analyzerVersion: "1",
    generatedAt: "2026-08-01T10:00:00.000Z",
    elapsedMs: 4,
    status: "available",
    profile: {
      sourceMetrics: {
        characterCount: 22,
        nonWhitespaceCharacterCount: 20,
        lineCount: 1,
        paragraphCount: 1,
        sentenceLikeUnitCount: 1,
      },
      structuralCharacteristics: {
        isWhitespaceOnly: false,
        hasParagraphBreaks: false,
        containsNonAscii: false,
        newlineStyle: "none",
        punctuationSignalCount: 1,
      },
      continuityCharacteristics: {
        transitionCueCount: 0,
        localityShiftCueCount: 0,
        chronologyShiftCueCount: 0,
        perspectiveShiftCueCount: 0,
        fragmentationSignalCount: 0,
      },
      ambiguityCharacteristics: {
        uncertaintyCueCount: 0,
        unresolvedReferenceCueCount: 0,
        contradictionCueCount: 0,
      },
      extractionRiskProfile: {
        overallRisk: "low",
        longFormRisk: "low",
        fragmentationRisk: "low",
        ambiguityRisk: "low",
        tailCoverageRisk: "low",
        continuityRisk: "low",
      },
    },
  };
}

function buildCompletenessAnalysisResult(): CompletenessAnalysisShadowResult {
  return {
    schemaVersion: "1",
    analyzerVersion: "1",
    generatedAt: "2026-08-01T10:00:00.000Z",
    elapsedMs: 6,
    attemptNumber: 1,
    status: "available",
    report: {
      schemaVersion: "1",
      analyzerVersion: "1",
      sourceIdentity: {
        sourceHash: "source-hash",
        sourceLength: 22,
      },
      candidateIdentity: {
        candidateHash: "candidate-hash",
        candidateKind: "primary_extraction",
      },
      status: "available",
      adequacy: "adequate",
      coverage: {
        largestCoveredSpanEnd: 22,
        coverageRatio: 1,
        uncoveredPrefix: null,
        uncoveredTail: null,
        internalUncoveredRegions: [],
        measurementAvailability: "full",
      },
      gaps: {
        gaps: [],
        canonicalGapCount: 0,
      },
      lateRetention: {
        lateSectionStart: 16,
        lateSectionSentenceUnits: 1,
        lateSectionObservationCount: 1,
        status: "retained",
      },
      endingRetention: {
        endingStart: 19,
        retained: true,
        status: "retained",
      },
      structuralAssessment: {
        sceneOrLocalityCount: 1,
        observationCount: 2,
        overmergeCueGroups: 0,
        repeatedSpanRealizationCount: 0,
        outOfOrderLocalityCount: 0,
        outOfOrderUnitCount: 0,
        weaknessSignals: [],
      },
      recoveryRecommendation: {
        disposition: "not_required",
        targetedPhysicalGapIds: [],
        eligibility: "eligible",
        advisoryClass: "advisory",
        reasons: [],
      },
      metricDiscrepancies: [],
      diagnosticReasons: [],
    },
    v2DiagnosticReference: {
      guardVerdict: "pass",
      fallbackReason: null,
      coverageRatio: 1,
      uncoveredTailChars: 0,
      lateSectionObservationCount: 1,
      overmergeMatchedCueGroups: 0,
      overmergeTotalCueMatches: 0,
    },
    equivalence: {
      classification: "equivalent",
      reasons: ["same_coarse_adequacy"],
      discrepancies: [],
    },
  };
}

function buildDescriptiveProviderEvidence(): DescriptiveExtractionProviderEvidence {
  return {
    schemaVersion: "1",
    artifactVersion: "1",
    sanitizationVersion: "san-v1",
    subsystem: "descriptive_extraction",
    sourceIdentity: "OBS-A-001",
    sourceHash: "source-hash",
    attemptIdentity: {
      subsystem: "descriptive_extraction",
      identity: "descriptive_extraction:OBS-A-001:request-1:attempt-1:root",
      fingerprint: "attempt-fingerprint",
      sourceIdentity: "OBS-A-001",
      extractionRequestId: "request-1",
      attemptNumber: 1,
      retryParentAttemptIdentity: null,
    },
    evidenceLifecycle: "complete",
    request: {
      requestFingerprint: "request-fingerprint",
      promptFingerprint: "prompt-fingerprint",
      schemaFingerprint: "schema-fingerprint",
      modelIdentifier: "gpt-4.1-mini",
    },
    providerBoundary: {
      status: "completed",
      incompleteReason: null,
      sanitizedPayload: {
        output_text: "{\"dreamLanguage\":\"en\",\"scenes\":[]}",
      },
      payloadHash: "payload-hash",
      tokenUsage: {
        input: 10,
        output: 12,
        total: 22,
      },
      latencyMs: 1000,
      providerMetadata: {
        provider: "openai",
      },
      occurredAt: "2026-08-02T12:00:00.000Z",
    },
    parsing: {
      parserFingerprint: "parser-fingerprint",
      parserSchemaFingerprint: "schema-fingerprint",
      status: "parsed",
      structuredOutput: {
        dreamLanguage: "en",
        scenes: [],
      },
      structuredOutputHash: "structured-output-hash",
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: true,
    },
    compatibility: {
      replayMode: "frozen_parsed_output",
      state: "compatible",
      replayable: true,
    },
    capture: {
      providerExecutionState: "completed",
      parsingState: "parsed",
      evidenceCaptureState: "complete",
      artifactWriteState: "not_written",
    },
  };
}

describe("parseObservationBenchmarkRunCliArgs", () => {
  it("accepts a single benchmark id", () => {
    expect(parseObservationBenchmarkRunCliArgs(["--id", "OBS-A-001"])).toEqual({
      mode: "single",
      benchmarkIds: ["OBS-A-001"],
    });
  });

  it("accepts all benchmarks", () => {
    expect(parseObservationBenchmarkRunCliArgs(["--all"])).toEqual({
      mode: "all",
      benchmarkIds: null,
    });
  });

  it("rejects missing selection", () => {
    expect(() => parseObservationBenchmarkRunCliArgs([])).toThrow(/usage/i);
  });

  it("rejects conflicting selection flags", () => {
    expect(() => parseObservationBenchmarkRunCliArgs(["--all", "--id", "OBS-A-001"])).toThrow(
      /choose exactly one/i,
    );
  });

  it("accepts an output-root override", () => {
    expect(parseObservationBenchmarkRunCliArgs(["--id", "OBS-A-001", "--output-root", "tmp/output"])).toEqual({
      mode: "single",
      benchmarkIds: ["OBS-A-001"],
      outputRoot: "tmp/output",
    });
  });
});

describe("runObservationBenchmarks", () => {
  let tempDir: string;
  let sourcePath: string;
  let manifestPath: string;
  let outputRoot: string;
  let repositoryState: ObservationBenchmarkRepositoryState;
  let fingerprints: ObservationBenchmarkFingerprintSet;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "observation-benchmark-runner-"));
    sourcePath = path.join(tempDir, "Observation-Benchmark-Dream-Corpus-v1.md");
    manifestPath = path.join(tempDir, "Observation-Benchmark-Corpus-Manifest-v1.json");
    outputRoot = path.join(tempDir, "output-root");
    await fs.writeFile(sourcePath, buildCorpus(), "utf8");
    await writeObservationBenchmarkCorpusManifest({
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
    });
    repositoryState = {
      commitSha: "39b3730cf23b71ef55a0e21d8f14284c73c9b06c",
      shortCommitSha: "39b3730",
      isDirty: true,
      hasUntrackedFiles: true,
      changedPaths: ["package.json", "src/example.ts"],
    };
    fingerprints = {
      corpus: {
        authorityPath: sourcePath,
        authorityHash: "authority-hash",
        manifestPath,
        manifestHash: "manifest-hash",
      },
      extractor: {
        filePath: "src/cognition/observation/llm-scene-observation-extractor.ts",
        fileHash: "extractor-file-hash",
        promptFingerprint: "extractor-prompt-hash",
        promptFingerprintMode: "source_slice_hash",
        schemaFingerprint: "extractor-schema-hash",
        schemaFingerprintMode: "source_slice_hash",
        modelIdentifier: "gpt-4.1-mini",
        timeoutMs: 180000,
        retryPolicy: "same_topology_retry_max_attempts_2",
      },
      diagnostics: {
        filePath: "src/cognition/observation/llm-scene-observation-diagnostics.ts",
        fileHash: "diagnostics-file-hash",
        normalizationAuthorityPath: "src/domain/observation/v2-runtime.ts",
        normalizationAuthorityHash: "runtime-file-hash",
      },
      derivedConstructor: {
        filePath: "src/cognition/observation/llm-derived-structure-constructor.ts",
        fileHash: "derived-file-hash",
        promptFingerprint: "derived-prompt-hash",
        promptFingerprintMode: "source_slice_hash",
        schemaFingerprint: "derived-schema-hash",
        schemaFingerprintMode: "source_slice_hash",
        modelIdentifier: "gpt-4.1-mini",
        timeoutMs: 180000,
      },
      runner: {
        fileHashes: {
          runner: "runner-hash",
          artifactWriter: "artifact-writer-hash",
          fingerprint: "fingerprint-hash",
          corpusParser: "parser-hash",
          corpusManifest: "manifest-module-hash",
        },
      },
      sourceAnalysis: {
        contractPath: "src/cognition/observation-v3/source-analysis/source-analysis-contract.ts",
        contractHash: "source-analysis-contract-hash",
        analyzerPath: "src/cognition/observation-v3/source-analysis/source-analysis.ts",
        analyzerHash: "source-analysis-analyzer-hash",
      },
      completenessAnalysis: {
        contractPath: "src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract.ts",
        contractHash: "completeness-analysis-contract-hash",
        analyzerPath: "src/cognition/observation-v3/completeness-analysis/completeness-analyzer.ts",
        analyzerHash: "completeness-analysis-analyzer-hash",
        rulesHash: "completeness-analysis-rules-hash",
        equivalencePath: "src/cognition/observation-v3/completeness-analysis/v2-equivalence.ts",
        equivalenceHash: "completeness-analysis-equivalence-hash",
      },
    };
  });

  it("runs the isolated extractor and derived constructor for a selected benchmark", async () => {
    const extractor = vi.fn().mockImplementation(async (input: {
      reflectiveObjectId: string;
      userId: string;
      dreamText: string;
      onAttemptEvidence?: (evidence: unknown) => void | Promise<void>;
    }) => {
      const bundle = buildBundle({
        reflectiveObjectId: input.reflectiveObjectId,
        userId: input.userId,
      });
      await input.onAttemptEvidence?.({
        attempt: 1,
        status: "candidate_accepted",
        candidateBundle: bundle,
        diagnostics: {
          attempt: 1,
          guardVerdict: "pass",
          fallbackReason: null,
          normalizedSceneCount: 1,
          normalizedObservationCount: 2,
          coverageRatio: 1,
          uncoveredTailChars: 0,
          lateSectionObservationCount: 1,
          overmergeMatchedCueGroups: 0,
          overmergeTotalCueMatches: 0,
        },
        acceptedAttempt: true,
        causedFinalFallback: false,
      });
      return {
        mode: "validated_llm" as const,
        bundle,
        diagnostics: {
          attempts: [],
          acceptedAttempt: 1 as const,
        },
      };
    });
    const derived = vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => ({
      ...bundle,
      runtimeVersion: "observation_v2_phase1",
    }));

    const result = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:15:00.000Z"),
    });

    expect(result.runId).toBe("20260730T121500Z-39b3730-OBS-A-001");
    expect(result.artifactDirectory).toBe(path.join(outputRoot, "20260730T121500Z-39b3730-OBS-A-001"));
    expect(result.runStatus).toBe("completed");
    expect(result.totalCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(extractor).toHaveBeenCalledWith(
      expect.objectContaining({
        dreamText: "First benchmark dream.",
      }),
    );
    expect(derived).toHaveBeenCalledTimes(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        benchmarkId: "OBS-A-001",
        success: true,
        extraction: expect.objectContaining({
          status: "success",
        }),
        derivedStructures: expect.objectContaining({
          status: "applied",
        }),
        sceneCount: 1,
        observationCount: 2,
        diagnosticsLabel: "accepted_after_attempt_1",
      }),
    );

    const manifest = JSON.parse(
      await fs.readFile(path.join(result.artifactDirectory!, "run-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    const index = JSON.parse(
      await fs.readFile(path.join(result.artifactDirectory!, "benchmark-index.json"), "utf8"),
    ) as Record<string, Record<string, unknown>>;
    const itemSummary = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "item-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const attemptSummary = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "attempts", "attempt-01", "attempt-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const derivedArtifact = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "derived-result.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(manifest.runStatus).toBe("completed");
    expect(manifest.repositoryDirtyState).toBe(true);
    expect(manifest.changedPaths).toEqual(["package.json", "src/example.ts"]);
    expect(manifest.environment).toEqual(
      expect.objectContaining({
        hasOpenAiApiKey: true,
      }),
    );
    expect(JSON.stringify(manifest)).not.toContain("sk-");
    expect(index["OBS-A-001"]).toEqual(
      expect.objectContaining({
        status: "success",
      }),
    );
    expect(itemSummary.finalStatus).toBe("success");
    expect(itemSummary.attemptEvidenceCompleteness).toEqual(
      expect.objectContaining({
        status: "complete",
        expectedAttemptCount: 1,
        preservedAttemptCount: 1,
      }),
    );
    expect(attemptSummary).toEqual(
      expect.objectContaining({
        attemptNumber: 1,
        status: "candidate_accepted",
        candidateBundleAvailable: true,
        acceptedAttempt: true,
      }),
    );
    expect(derivedArtifact.derivedStatus).toMatch(/output_(changed|unchanged)/);
    expect(derivedArtifact.providerApplicationConfirmed).toBe(false);
  });

  it("fails clearly when the api key is missing", async () => {
    const extractor = vi.fn();
    const derived = vi.fn();

    const result = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: false,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:16:00.000Z"),
    });

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(extractor).not.toHaveBeenCalled();
    expect(derived).not.toHaveBeenCalled();
    expect(result.runStatus).toBe("completed_with_failures");
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        success: false,
        failureStage: "configuration",
        failureReason: "missing_openai_api_key",
      }),
    );

    const manifest = JSON.parse(
      await fs.readFile(path.join(result.artifactDirectory!, "run-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(manifest.runStatus).toBe("completed_with_failures");
    expect(JSON.stringify(manifest)).not.toContain("OPENAI_API_KEY");
  });

  it("writes a source-profile artifact when the extractor emits shadow source analysis", async () => {
    const extractor = vi.fn().mockImplementation(
      async (input: {
        userId: string;
        reflectiveObjectId: string;
        dreamText: string;
        onSourceAnalysis?: (result: SourceAnalysisShadowResult) => void | Promise<void>;
      }) => {
        await input.onSourceAnalysis?.(buildSourceAnalysisResult());

        return {
          mode: "validated_llm" as const,
          bundle: buildBundle({
            reflectiveObjectId: input.reflectiveObjectId,
            userId: input.userId,
          }),
          payload: {
            reflectiveObjectId: input.reflectiveObjectId,
            observation: {
              observationVersion: "observation_v2_phase1",
              scenes: [],
            },
          },
          diagnostics: {
            attempts: [
              {
                attempt: 1,
                model: "gpt-4.1-mini",
                dreamTextLength: input.dreamText.length,
                elapsedMs: 10,
                providerStatus: "completed",
                providerIncompleteReason: null,
                inputTokenUsage: 10,
                outputTokenUsage: 10,
                totalTokenUsage: 20,
                providerReturnedStructuredOutput: true,
                rawSceneCount: 1,
                rawObservationCount: 2,
                rawEvidenceSpanCount: 2,
                rawLargestCoveredSpanEnd: 20,
                rawLateSectionObservationCount: 0,
                normalizedSceneCount: 1,
                normalizedObservationCount: 2,
                normalizedEvidenceSpanCount: 2,
                defaultedFieldCount: 0,
                largestCoveredSpanEnd: 20,
                coverageRatio: 1,
                uncoveredTailChars: 0,
                lateSectionStart: 0,
                lateSectionSentenceUnits: 1,
                lateSectionObservationCount: 0,
                overmergeMatchedCueGroups: 0,
                overmergeTotalCueMatches: 0,
                projectedFragmentCount: 0,
                projectedSummaryTraceCount: 0,
                guardVerdict: "pass" as const,
                fallbackReason: null,
              },
            ],
            acceptedAttempt: 1 as const,
          },
        };
      },
    );
    const derived = vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const result = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:18:00.000Z"),
    });

    const artifact = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "source-profile.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(artifact).toEqual(
      expect.objectContaining({
        schemaVersion: "1",
        analyzerVersion: "1",
        sourceHash: expect.any(String),
        analyzerFingerprint: "source-analysis-analyzer-hash",
        contractFingerprint: "source-analysis-contract-hash",
        status: "available",
        profile: expect.objectContaining({
          sourceMetrics: expect.objectContaining({
            characterCount: 22,
          }),
        }),
      }),
    );
  });

  it("writes attempt-level completeness artifacts when the extractor emits shadow completeness analysis", async () => {
    const extractor = vi.fn().mockImplementation(
      async (input: {
        userId: string;
        reflectiveObjectId: string;
        dreamText: string;
        onAttemptEvidence?: (evidence: unknown) => void | Promise<void>;
        onCompletenessAnalysis?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
      }) => {
        const bundle = buildBundle({
          reflectiveObjectId: input.reflectiveObjectId,
          userId: input.userId,
        });
        await input.onAttemptEvidence?.({
          attempt: 1,
          status: "candidate_accepted",
          startedAt: "2026-08-01T12:00:00.000Z",
          completedAt: "2026-08-01T12:00:00.100Z",
          elapsedMs: 100,
          providerStatus: null,
          providerIncompleteReason: null,
          providerReturnedStructuredOutput: true,
          parseStatus: "parsed",
          schemaValidationStatus: "passed",
          candidateBundle: bundle,
          diagnostics: {
            attempt: 1,
            guardVerdict: "pass",
            fallbackReason: null,
            normalizedSceneCount: 1,
            normalizedObservationCount: 2,
            coverageRatio: 1,
            uncoveredTailChars: 0,
            lateSectionObservationCount: 1,
            overmergeMatchedCueGroups: 0,
            overmergeTotalCueMatches: 0,
          },
          sceneCount: 1,
          observationCount: 2,
          evidenceSpanCount: 2,
          guardVerdict: "pass",
          rejectionReasons: [],
          retryReason: null,
          inputTokenUsage: null,
          outputTokenUsage: null,
          totalTokenUsage: null,
          acceptedAttempt: true,
          causedFinalFallback: false,
          causedRetry: false,
          rawProviderResponsePreserved: false,
          errorMessage: null,
        });
        await input.onCompletenessAnalysis?.(buildCompletenessAnalysisResult());

        return {
          mode: "validated_llm" as const,
          bundle,
          payload: {
            reflectiveObjectId: input.reflectiveObjectId,
            observation: {
              observationVersion: "observation_v2_phase1",
              scenes: [],
            },
          },
          diagnostics: {
            attempts: [],
            acceptedAttempt: 1 as const,
          },
        };
      },
    );
    const derived = vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const result = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-08-01T12:00:00.000Z"),
    });

    const itemArtifact = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "completeness-report.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const attemptArtifact = JSON.parse(
      await fs.readFile(
        path.join(
          result.artifactDirectory!,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "completeness-report.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(itemArtifact).toEqual(
      expect.objectContaining({
        attempts: [
          expect.objectContaining({
            attemptNumber: 1,
            status: "available",
            equivalence: expect.objectContaining({
              classification: "equivalent",
            }),
          }),
        ],
      }),
    );
    expect(attemptArtifact).toEqual(
      expect.objectContaining({
        attemptNumber: 1,
        status: "available",
        analyzerFingerprint: "completeness-analysis-analyzer-hash",
        contractFingerprint: "completeness-analysis-contract-hash",
        rulesFingerprint: "completeness-analysis-rules-hash",
        equivalenceFingerprint: "completeness-analysis-equivalence-hash",
      }),
    );
  });

  it("writes canonical descriptive provider evidence and a write receipt for each preserved attempt", async () => {
    const extractor = vi.fn().mockImplementation(
      async (input: {
        userId: string;
        reflectiveObjectId: string;
        dreamText: string;
        onAttemptEvidence?: (evidence: unknown) => void | Promise<void>;
        onDescriptiveProviderEvidence?: (evidence: DescriptiveExtractionProviderEvidence) => void | Promise<void>;
      }) => {
        const bundle = buildBundle({
          reflectiveObjectId: input.reflectiveObjectId,
          userId: input.userId,
        });
        await input.onAttemptEvidence?.({
          attempt: 1,
          status: "candidate_accepted",
          startedAt: "2026-08-02T12:00:00.000Z",
          completedAt: "2026-08-02T12:00:00.100Z",
          elapsedMs: 100,
          providerStatus: "completed",
          providerIncompleteReason: null,
          providerReturnedStructuredOutput: true,
          parseStatus: "parsed",
          schemaValidationStatus: "passed",
          candidateBundle: bundle,
          diagnostics: null,
          sceneCount: 1,
          observationCount: 2,
          evidenceSpanCount: 2,
          guardVerdict: "pass",
          rejectionReasons: [],
          retryReason: null,
          inputTokenUsage: 10,
          outputTokenUsage: 12,
          totalTokenUsage: 22,
          acceptedAttempt: true,
          causedFinalFallback: false,
          causedRetry: false,
          rawProviderResponsePreserved: false,
          errorMessage: null,
        });
        await input.onDescriptiveProviderEvidence?.(buildDescriptiveProviderEvidence());

        return {
          mode: "validated_llm" as const,
          bundle,
          payload: {
            reflectiveObjectId: input.reflectiveObjectId,
            observation: {
              observationVersion: "observation_v2_phase1",
              scenes: [],
            },
          },
          diagnostics: {
            attempts: [],
            acceptedAttempt: 1 as const,
          },
        };
      },
    );

    const result = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: async (bundle: ObservationV2Bundle) => bundle,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-08-02T12:00:00.000Z"),
    });

    const evidenceArtifact = JSON.parse(
      await fs.readFile(
        path.join(
          result.artifactDirectory!,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "descriptive-provider-evidence.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const receiptArtifact = JSON.parse(
      await fs.readFile(
        path.join(
          result.artifactDirectory!,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "descriptive-provider-evidence.receipt.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(evidenceArtifact).toEqual(
      expect.objectContaining({
        subsystem: "descriptive_extraction",
        evidenceLifecycle: "complete",
        providerBoundary: expect.objectContaining({
          payloadHash: "payload-hash",
        }),
        parsing: expect.objectContaining({
          structuredOutputHash: "structured-output-hash",
        }),
      }),
    );
    expect(receiptArtifact).toEqual(
      expect.objectContaining({
        status: "written",
        destination: expect.stringContaining("descriptive-provider-evidence.json"),
        expectedHash: expect.any(String),
        observedHash: expect.any(String),
      }),
    );
  });

  it("writes an unavailable source-profile artifact when the extractor does not emit one", async () => {
    const extractor = vi.fn().mockResolvedValue({
      mode: "validated_llm" as const,
      bundle: buildBundle({
        reflectiveObjectId: "reflective-1",
        userId: "user-1",
      }),
      payload: {
        reflectiveObjectId: "reflective-1",
        observation: {
          observationVersion: "observation_v2_phase1",
          scenes: [],
        },
      },
      diagnostics: {
        attempts: [],
        acceptedAttempt: 1 as const,
      },
    });
    const derived = vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const result = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:19:00.000Z"),
    });

    const artifact = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "source-profile.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(artifact).toEqual(
      expect.objectContaining({
        status: "unavailable",
        sourceHash: expect.any(String),
        analyzerFingerprint: "source-analysis-analyzer-hash",
        contractFingerprint: "source-analysis-contract-hash",
        failure: {
          code: "not_emitted",
          message: "source_analysis_not_emitted_by_extractor",
        },
      }),
    );
  });

  it("continues through all benchmarks when one extraction fails", async () => {
    const extractor = vi
      .fn()
      .mockImplementationOnce(async (input: {
        reflectiveObjectId: string;
        userId: string;
        onAttemptEvidence?: (evidence: unknown) => void | Promise<void>;
      }) => {
        const firstBundle = buildBundle({
          reflectiveObjectId: input.reflectiveObjectId,
          userId: input.userId,
          sceneCount: 1,
          observationCount: 2,
        });
        const secondBundle = buildBundle({
          reflectiveObjectId: input.reflectiveObjectId,
          userId: input.userId,
          sceneCount: 1,
          observationCount: 1,
        });
        await input.onAttemptEvidence?.({
          attempt: 1,
          status: "candidate_rejected",
          candidateBundle: firstBundle,
          diagnostics: {
            attempt: 1,
            guardVerdict: "coverage_guard_failed",
            fallbackReason: "coverage_guard_failed",
            normalizedSceneCount: 1,
            normalizedObservationCount: 2,
            coverageRatio: 0.3,
            uncoveredTailChars: 1200,
            lateSectionObservationCount: 0,
            overmergeMatchedCueGroups: 0,
            overmergeTotalCueMatches: 0,
          },
          acceptedAttempt: false,
          causedFinalFallback: false,
        });
        await input.onAttemptEvidence?.({
          attempt: 2,
          status: "candidate_rejected",
          candidateBundle: secondBundle,
          diagnostics: {
            attempt: 2,
            guardVerdict: "coverage_guard_failed",
            fallbackReason: "coverage_guard_failed",
            normalizedSceneCount: 1,
            normalizedObservationCount: 1,
            coverageRatio: 0.2,
            uncoveredTailChars: 1500,
            lateSectionObservationCount: 0,
            overmergeMatchedCueGroups: 0,
            overmergeTotalCueMatches: 0,
          },
          acceptedAttempt: false,
          causedFinalFallback: true,
        });
        return {
          mode: "fallback" as const,
          reason: "coverage_guard_failed_after_retry",
          diagnostics: {
            attempts: [
              {
                attempt: 1 as const,
                model: "gpt-4.1-mini",
                dreamTextLength: 22,
                elapsedMs: 10,
                providerStatus: "completed",
                providerIncompleteReason: null,
                inputTokenUsage: null,
                outputTokenUsage: null,
                totalTokenUsage: null,
                providerReturnedStructuredOutput: true,
                rawSceneCount: 1,
                rawObservationCount: 2,
                rawEvidenceSpanCount: 2,
                rawLargestCoveredSpanEnd: 12,
                rawLateSectionObservationCount: 0,
                normalizedSceneCount: 1,
                normalizedObservationCount: 2,
                normalizedEvidenceSpanCount: 2,
                defaultedFieldCount: 0,
                largestCoveredSpanEnd: 12,
                coverageRatio: 0.3,
                uncoveredTailChars: 1200,
                lateSectionStart: 10,
                lateSectionSentenceUnits: 3,
                lateSectionObservationCount: 0,
                overmergeMatchedCueGroups: 0,
                overmergeTotalCueMatches: 0,
                projectedFragmentCount: 2,
                projectedSummaryTraceCount: 2,
                guardVerdict: "coverage_guard_failed" as const,
                fallbackReason: "coverage_guard_failed",
              },
              {
                attempt: 2 as const,
                model: "gpt-4.1-mini",
                dreamTextLength: 22,
                elapsedMs: 12,
                providerStatus: "completed",
                providerIncompleteReason: null,
                inputTokenUsage: null,
                outputTokenUsage: null,
                totalTokenUsage: null,
                providerReturnedStructuredOutput: true,
                rawSceneCount: 1,
                rawObservationCount: 1,
                rawEvidenceSpanCount: 1,
                rawLargestCoveredSpanEnd: 8,
                rawLateSectionObservationCount: 0,
                normalizedSceneCount: 1,
                normalizedObservationCount: 1,
                normalizedEvidenceSpanCount: 1,
                defaultedFieldCount: 0,
                largestCoveredSpanEnd: 8,
                coverageRatio: 0.2,
                uncoveredTailChars: 1500,
                lateSectionStart: 10,
                lateSectionSentenceUnits: 3,
                lateSectionObservationCount: 0,
                overmergeMatchedCueGroups: 0,
                overmergeTotalCueMatches: 0,
                projectedFragmentCount: 1,
                projectedSummaryTraceCount: 1,
                guardVerdict: "coverage_guard_failed" as const,
                fallbackReason: "coverage_guard_failed",
              },
            ],
            fallbackReason: "coverage_guard_failed_after_retry",
          },
        };
      })
      .mockImplementationOnce(async (input: {
        reflectiveObjectId: string;
        userId: string;
        onAttemptEvidence?: (evidence: unknown) => void | Promise<void>;
      }) => {
        const bundle = buildBundle({
          reflectiveObjectId: input.reflectiveObjectId,
          userId: input.userId,
          sceneCount: 2,
          observationCount: 1,
        });
        await input.onAttemptEvidence?.({
          attempt: 2,
          status: "candidate_accepted",
          candidateBundle: bundle,
          diagnostics: {
            attempt: 2,
            guardVerdict: "pass",
            fallbackReason: null,
            normalizedSceneCount: 2,
            normalizedObservationCount: 2,
            coverageRatio: 1,
            uncoveredTailChars: 0,
            lateSectionObservationCount: 1,
            overmergeMatchedCueGroups: 0,
            overmergeTotalCueMatches: 0,
          },
          acceptedAttempt: true,
          causedFinalFallback: false,
        });
        return {
          mode: "validated_llm" as const,
          bundle,
          diagnostics: {
            attempts: [],
            acceptedAttempt: 2 as const,
          },
        };
      });
    const derived = vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const result = await runObservationBenchmarks({
      benchmarkIds: null,
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--all"],
      now: () => new Date("2026-07-30T12:17:00.000Z"),
    });

    expect(result.totalCount).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.runStatus).toBe("completed_with_failures");
    expect(derived).toHaveBeenCalledTimes(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        benchmarkId: "OBS-A-001",
        success: false,
        failureStage: "extraction",
        failureReason: "coverage_guard_failed_after_retry",
      }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        benchmarkId: "OBS-A-002",
        success: true,
        diagnosticsLabel: "accepted_after_attempt_2",
      }),
    );

    const failedSummary = JSON.parse(
      await fs.readFile(
        path.join(result.artifactDirectory!, "items", "OBS-A-001", "item-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const failedAttemptCandidate = JSON.parse(
      await fs.readFile(
        path.join(
          result.artifactDirectory!,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "candidate-bundle.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const runSummary = JSON.parse(
      await fs.readFile(path.join(result.artifactDirectory!, "run-summary.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(failedSummary.finalStatus).toBe("extraction_failed");
    expect(failedSummary.attemptEvidenceCompleteness).toEqual(
      expect.objectContaining({
        status: "complete",
        expectedAttemptCount: 2,
        preservedAttemptCount: 2,
        candidateBundlesPreserved: 2,
      }),
    );
    expect(failedAttemptCandidate.scenes).toHaveLength(1);
    expect(runSummary.failedItems).toBe(1);
    expect(runSummary.totalExtractionAttempts).toBe(3);
    expect(runSummary.rejectedCandidateAttempts).toBe(2);
    expect(runSummary.failedItemsWithReviewableRejectedBundles).toBe(1);
    expect(runSummary.failureReasons).toEqual(
      expect.objectContaining({
        coverage_guard_failed_after_retry: 1,
      }),
    );
  });

  it("detects manifest-authority drift before execution", async () => {
    await fs.writeFile(sourcePath, buildCorpus({ "OBS-A-001": "Changed dream text." }), "utf8");

    await expect(
      runObservationBenchmarks({
        benchmarkIds: ["OBS-A-001"],
        sourcePath,
        manifestPath,
        expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
        hasOpenAiApiKey: true,
        extractor: vi.fn(),
        derivedConstructor: vi.fn(),
      }),
    ).rejects.toThrow(/manifest.*authority/i);
  });

  it("creates the run manifest before extraction begins and uses a collision-safe directory suffix", async () => {
    const extractor = vi.fn().mockImplementation(async () => {
      const runDirectories = await fs.readdir(outputRoot);
      expect(runDirectories).toHaveLength(1);
      const manifestRaw = await fs.readFile(path.join(outputRoot, runDirectories[0]!, "run-manifest.json"), "utf8");
      expect(manifestRaw).toContain("\"runStatus\": \"running\"");

      return {
        mode: "validated_llm" as const,
        bundle: buildBundle({
          reflectiveObjectId: "object-1",
          userId: "benchmark-runner",
        }),
        diagnostics: {
          attempts: [],
          acceptedAttempt: 1 as const,
        },
      };
    });
    const derived = vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const first = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor,
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:18:00.000Z"),
    });
    const second = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor: vi.fn().mockResolvedValue({
        mode: "validated_llm" as const,
        bundle: buildBundle({
          reflectiveObjectId: "object-2",
          userId: "benchmark-runner",
        }),
        diagnostics: {
          attempts: [],
          acceptedAttempt: 1 as const,
        },
      }),
      derivedConstructor: derived,
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:18:00.000Z"),
    });

    expect(first.runId).toBe("20260730T121800Z-39b3730-OBS-A-001");
    expect(second.runId).toBe("20260730T121800Z-39b3730-OBS-A-001-02");
  });

  it("records derived changed and unchanged classifications", async () => {
    const changed = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-001"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor: vi.fn().mockResolvedValue({
        mode: "validated_llm" as const,
        bundle: buildBundle({
          reflectiveObjectId: "object-1",
          userId: "benchmark-runner",
          sceneCount: 2,
        }),
        diagnostics: {
          attempts: [],
          acceptedAttempt: 1 as const,
        },
      }),
      derivedConstructor: vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => ({
        ...bundle,
        scenes: bundle.scenes.slice(0, 1),
      })),
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-001"],
      now: () => new Date("2026-07-30T12:19:00.000Z"),
    });

    const unchanged = await runObservationBenchmarks({
      benchmarkIds: ["OBS-A-002"],
      sourcePath,
      manifestPath,
      expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
      hasOpenAiApiKey: true,
      extractor: vi.fn().mockResolvedValue({
        mode: "validated_llm" as const,
        bundle: buildBundle({
          reflectiveObjectId: "object-2",
          userId: "benchmark-runner",
        }),
        diagnostics: {
          attempts: [],
          acceptedAttempt: 1 as const,
        },
      }),
      derivedConstructor: vi.fn().mockImplementation(async (bundle: ObservationV2Bundle) => bundle),
      artifactOutputRoot: outputRoot,
      repositoryState,
      fingerprints,
      cliArgs: ["--id", "OBS-A-002"],
      now: () => new Date("2026-07-30T12:20:00.000Z"),
    });

    const changedArtifact = JSON.parse(
      await fs.readFile(
        path.join(changed.artifactDirectory!, "items", "OBS-A-001", "derived-result.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const unchangedArtifact = JSON.parse(
      await fs.readFile(
        path.join(unchanged.artifactDirectory!, "items", "OBS-A-002", "derived-result.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(changedArtifact.derivedStatus).toBe("output_changed");
    expect(unchangedArtifact.derivedStatus).toBe("output_unchanged");
  });

  it("records an aborted run when an unexpected top-level error occurs after manifest creation", async () => {
    await expect(
      runObservationBenchmarks({
        benchmarkIds: ["OBS-A-001"],
        sourcePath,
        manifestPath,
        expectedBenchmarkOrder: ["OBS-A-001", "OBS-A-002"],
        hasOpenAiApiKey: true,
        extractor: vi.fn().mockResolvedValue({
          mode: "validated_llm" as const,
          bundle: buildBundle({
            reflectiveObjectId: "object-1",
            userId: "benchmark-runner",
          }),
          diagnostics: {
            attempts: [],
            acceptedAttempt: 1 as const,
          },
        }),
        derivedConstructor: vi.fn().mockImplementation(async () => {
          throw new Error("derived exploded");
        }),
        artifactOutputRoot: outputRoot,
        repositoryState,
        fingerprints,
        cliArgs: ["--id", "OBS-A-001"],
        now: () => new Date("2026-07-30T12:21:00.000Z"),
        forceTopLevelArtifactFailureAfterRun: true,
      }),
    ).rejects.toThrow(/forced_top_level_artifact_failure/);

    const runDirectories = await fs.readdir(outputRoot);
    const manifest = JSON.parse(
      await fs.readFile(path.join(outputRoot, runDirectories[0]!, "run-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(manifest.runStatus).toBe("aborted");
  });
});

describe("formatObservationBenchmarkRunSummary", () => {
  it("formats a concise successful item summary", () => {
    const summary = formatObservationBenchmarkRunSummary({
      benchmarkId: "OBS-A-001",
      success: true,
      extraction: {
        status: "success",
      },
      derivedStructures: {
        status: "applied",
      },
      sceneCount: 4,
      observationCount: 9,
      diagnosticsLabel: "accepted_after_attempt_1",
      elapsedMs: 2400,
    });

    expect(summary).toContain("OBS-A-001");
    expect(summary).toContain("Extraction:");
    expect(summary).toContain("[OK] Success");
    expect(summary).toContain("Derived structures:");
    expect(summary).toContain("[OK] Applied");
    expect(summary).toContain("Scene count:");
    expect(summary).toContain("4");
    expect(summary).toContain("Diagnostics:");
    expect(summary).toContain("accepted_after_attempt_1");
    expect(summary).toContain("Elapsed:");
    expect(summary).toContain("2.4 s");
  });
});

describe("gitignore expectation", () => {
  it("keeps the controlled-private validation root ignored", async () => {
    const gitignore = await fs.readFile(path.resolve(process.cwd(), ".gitignore"), "utf8");
    expect(gitignore).toContain(".validation/");
  });
});
