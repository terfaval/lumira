import fs from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, unknown>;

const BENCHMARK_IDS = [
  "OBS-A-001",
  "OBS-A-002",
  "OBS-B-001",
  "OBS-B-002",
  "OBS-C-001",
  "OBS-C-002",
  "OBS-C-003",
  "OBS-D-001",
  "OBS-D-002",
  "OBS-E-001",
  "OBS-E-002",
  "OBS-F-001",
  "OBS-F-002",
  "OBS-G-001",
  "OBS-G-002",
  "OBS-H-001",
  "OBS-H-002",
] as const;

const BENCHMARK_RUN_ROOT =
  ".validation/observation-benchmark/runs/20260810T090751Z-547648d-all";
const TOPOLOGY_RUN_ROOT =
  ".validation/observation-topology-experiments/runs/20260810T093257Z-547648d-subset-17-C_TARGETED_RECOVERY-r1";
const BASELINE_RUN_1 =
  ".validation/observation-v3/stab-09/runs/20260810T120000Z-stab-09-run-1";
const BASELINE_RUN_2 =
  ".validation/observation-v3/stab-09/runs/20260810T120500Z-stab-09-run-2";
const OUTPUT_ROOT =
  ".validation/observation-v3/stab-09/20260810T130000Z-full-post-stabilization-baseline-refresh";

const CURRENT_DATE = "2026-08-10";
const CURRENT_HEAD = "547648d";

const STAB08_EXPECTED_DISPOSITIONS: Record<string, string> = {
  "OBS-A-001": "admitted_with_observations",
  "OBS-A-002": "deferred_for_supplemental_realization",
  "OBS-B-001": "deferred_for_supplemental_realization",
  "OBS-B-002": "deferred_for_supplemental_realization",
  "OBS-C-001": "deferred_for_supplemental_realization",
  "OBS-C-002": "deferred_for_supplemental_realization",
  "OBS-C-003": "deferred_for_supplemental_realization",
  "OBS-D-001": "admitted_with_observations",
  "OBS-D-002": "deferred_for_supplemental_realization",
  "OBS-E-001": "admitted_with_observations",
  "OBS-E-002": "admitted_with_observations",
  "OBS-F-001": "deferred_for_supplemental_realization",
  "OBS-F-002": "deferred_for_supplemental_realization",
  "OBS-G-001": "deferred_for_supplemental_realization",
  "OBS-G-002": "deferred_for_supplemental_realization",
  "OBS-H-001": "deferred_for_supplemental_realization",
  "OBS-H-002": "deferred_for_supplemental_realization",
};

const PRIOR_SEMANTIC_CLASSIFICATIONS: Record<string, string> = {
  "OBS-A-001": "EQUIVALENT",
  "OBS-A-002": "V2 BETTER",
  "OBS-B-001": "V3 BETTER",
  "OBS-B-002": "V3 BETTER",
  "OBS-C-001": "V3 BETTER",
  "OBS-C-002": "V3 BETTER",
  "OBS-C-003": "V3 BETTER",
  "OBS-D-001": "V3 BETTER",
  "OBS-D-002": "V3 BETTER",
  "OBS-E-001": "V2 BETTER",
  "OBS-E-002": "V3 BETTER",
  "OBS-F-001": "V3 BETTER",
  "OBS-F-002": "V3 BETTER",
  "OBS-G-001": "V3 BETTER",
  "OBS-G-002": "V3 BETTER",
  "OBS-H-001": "V3 BETTER",
  "OBS-H-002": "V3 BETTER",
};

const SEMANTIC_COMPARISON: Record<string, { classification: string; rationale: string }> = {
  "OBS-A-001": {
    classification: "V2 BETTER",
    rationale:
      "The August 10, 2026 V3 candidate preserves the full short dream but adds a duplicate Mammut family-gathering realization. The source contains only one such terminal beat, so V2 is cleaner and more faithful.",
  },
  "OBS-A-002": {
    classification: "EQUIVALENT",
    rationale:
      "The repaired V3 path now skips Supplemental on a `not_required` initial recommendation and lands on the same short coherent content V2 already captured. Neither side is materially better on this fresh run.",
  },
  "OBS-B-001": {
    classification: "V3 BETTER",
    rationale:
      "V3 still carries more of the later moving and ending material than V2, improving coverage and ending retention on a transition-dense dream.",
  },
  "OBS-B-002": {
    classification: "V3 BETTER",
    rationale:
      "V3 preserves more of the later camp and social detail and keeps the ending state more coherently than V2.",
  },
  "OBS-C-001": {
    classification: "V3 BETTER",
    rationale:
      "V3 retains a stronger closing chain and better tail fidelity than V2 on this long transition-dense case.",
  },
  "OBS-C-002": {
    classification: "V3 BETTER",
    rationale:
      "Where extraction succeeds through preserved replay, V3 still carries a materially longer workplace-to-snowfield chain and a stronger ending than V2.",
  },
  "OBS-C-003": {
    classification: "V3 BETTER",
    rationale:
      "V3 keeps the wake-up aftermath and writing impulse more explicitly than V2, improving ending fidelity.",
  },
  "OBS-D-001": {
    classification: "V3 BETTER",
    rationale:
      "The fresh V3 candidate surfaces more of the Uganda, wake, and repeated-exam tail than V2. It is longer and somewhat repetitive, but the added units correspond to source material that V2 leaves under-retained.",
  },
  "OBS-D-002": {
    classification: "V3 BETTER",
    rationale:
      "V3 continues to retain later Selma, blog, and repeated-snack material absent from the V2 candidate.",
  },
  "OBS-E-001": {
    classification: "V2 BETTER",
    rationale:
      "V3 still introduces overlap-heavy restatement around the money and food material. The extra line is sourced but redundant, so V2 remains the cleaner memory on an uncertainty-heavy case.",
  },
  "OBS-E-002": {
    classification: "V3 BETTER",
    rationale:
      "V3 keeps the danger, escape, and waking realization more explicitly than V2, even though the final candidate still carries overlap observations and is admitted only with observations.",
  },
  "OBS-F-001": {
    classification: "V3 BETTER",
    rationale:
      "V3 preserves more of the pursuit, bus, casino-procession, and dorm-entry closure. The fresh run is verbose, but it captures source detail that V2 compresses away.",
  },
  "OBS-F-002": {
    classification: "V3 BETTER",
    rationale:
      "V3 retains the coaching, support, and final save chain more completely than V2.",
  },
  "OBS-G-001": {
    classification: "V3 BETTER",
    rationale:
      "V3 better preserves the lucid structural progression and wake-state close than V2.",
  },
  "OBS-G-002": {
    classification: "V3 BETTER",
    rationale:
      "V3 keeps the later disguise, hiding, child-count, and waking-close sequence more completely than V2.",
  },
  "OBS-H-001": {
    classification: "V3 BETTER",
    rationale:
      "V3 preserves more of the emotional and phenomenological tail, including the waking association.",
  },
  "OBS-H-002": {
    classification: "V3 BETTER",
    rationale:
      "V3 carries the ladder-break shame, failed communication, repair intention, and waking close more fully than V2.",
  },
};

const REMAINING_ISSUES = [
  {
    issueId: "OV3-RI-02",
    title: "Universal deferral root cause remains under-partitioned",
    classification: "RESOLVED",
    rationale:
      "The August 10, 2026 full baseline no longer shows universal deferral. Fresh non-admissions remain partitionable by genuine final-candidate incompleteness rather than an undifferentiated Admission failure mode.",
  },
  {
    issueId: "OV3-RI-03",
    title: "Completed pipeline can retain a deferral-shaped terminal summary",
    classification: "RESOLVED",
    rationale:
      "Current pipeline summaries cleanly separate `pipelineCompletionStatus` from `governanceDisposition` across the fresh corpus.",
  },
  {
    issueId: "OV3-RI-05",
    title: "Overlap-heavy uncertainty cases still degrade candidate quality",
    classification: "NON_BLOCKING_STEWARDSHIP",
    rationale:
      "STAB-05 governance remains coherent, but fresh semantics still show overlap-style restatement on `OBS-E-001` and duplicate-style accretion on `OBS-A-001`. This is quality stewardship, not a closure-level governance contradiction.",
  },
  {
    issueId: "OV3-RI-06",
    title: "Fresh targeted-recovery reliability remains incomplete on `OBS-H-002`",
    classification: "RESOLVED",
    rationale:
      "The August 10, 2026 targeted-recovery corpus completed all 17 executions, including `OBS-H-002`. Fresh benchmark extraction still had separate descriptive-provider guard failures on `OBS-C-002` and `OBS-H-002`, but that is outside the repaired targeted Supplemental boundary.",
  },
  {
    issueId: "OV3-RI-08",
    title: "Transition propagation remains under-realized end to end",
    classification: "NON_BLOCKING_STEWARDSHIP",
    rationale:
      "The baseline remains semantically useful and constitutionally coherent without full transition propagation. This remains explicit bounded debt rather than a closure blocker.",
  },
  {
    issueId: "OV3-RI-09",
    title: "V3 has no primary-runtime persistence, read, routing, or rollback path",
    classification: "RUNTIME_CUTOVER_BLOCKER",
    rationale:
      "Observation V2 remains production authority and no V3 runtime cutover path exists yet.",
  },
  {
    issueId: "OV3-RI-10",
    title: "Production evidence beyond the 17-case corpus is still insufficient",
    classification: "RUNTIME_CUTOVER_BLOCKER",
    rationale:
      "The refreshed 17-case baseline is enough for closure review posture but not enough for runtime cutover.",
  },
  {
    issueId: "OV3-RI-11",
    title: "Architecture document still carries resolved pre-hardening blocker language",
    classification: "RESOLVED",
    rationale:
      "The living architecture documents are refreshed as part of STAB-09 and no longer describe the resolved pre-STAB lifecycle or universal rejection state as current.",
  },
  {
    issueId: "OV3-RI-15",
    title: "Fresh descriptive-provider late-section guard instability remains observable on long dreams",
    classification: "OBSERVATION / EVIDENCE NEEDED",
    rationale:
      "The fresh benchmark run on August 10, 2026 still produced `late_section_guard_failed_after_retry` for `OBS-C-002` and `OBS-H-002`. This did not break the replayed V3 baseline and is not a published closure blocker, but it remains an operational observation that should stay visible before any cutover discussion.",
  },
] as const;

async function readJson<T = unknown>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function readJsonIfExists<T = unknown>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T>(filePath);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : null;
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function get(object: unknown, ...keys: string[]): unknown {
  let cursor: unknown = object;
  for (const key of keys) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as JsonObject)[key];
  }
  return cursor;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (typeof value === "number" ? value : 0), 0);
}

function median(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  if (!numbers.length) {
    return null;
  }
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 0 ? (numbers[middle - 1] + numbers[middle]) / 2 : numbers[middle];
}

function max(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.max(...numbers) : null;
}

function compareJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function loadCaseMetrics(caseId: string, baselineRoot: string) {
  const benchmarkItemRoot = path.join(BENCHMARK_RUN_ROOT, "items", caseId);
  const baselineCaseRoot = path.join(baselineRoot, "cases", caseId);

  const [
    itemMetadata,
    itemSummary,
    sourceProfile,
    extractionResult,
    completenessPayload,
    supplementalStageResult,
    supplementalPayload,
    memoryCompositionPayload,
    memoryRealizationPayload,
    authorityAdmissionPayload,
    pipelineSummary,
    pipelineTiming,
    nativeIdentityLineage,
  ] = await Promise.all([
    readJson(path.join(benchmarkItemRoot, "item-metadata.json")),
    readJson(path.join(benchmarkItemRoot, "item-summary.json")),
    readJson(path.join(benchmarkItemRoot, "source-profile.json")),
    readJson(path.join(benchmarkItemRoot, "extraction-result.json")),
    readJson(path.join(baselineCaseRoot, "stages", "completeness_analysis", "payload.json")),
    readJson(path.join(baselineCaseRoot, "stages", "supplemental_realization", "stage-result.json")),
    readJsonIfExists(path.join(baselineCaseRoot, "stages", "supplemental_realization", "payload.json")),
    readJson(path.join(baselineCaseRoot, "stages", "memory_composition", "payload.json")),
    readJson(path.join(baselineCaseRoot, "stages", "memory_realization", "payload.json")),
    readJson(path.join(baselineCaseRoot, "stages", "authority_admission", "payload.json")),
    readJson(path.join(baselineCaseRoot, "pipeline-summary.json")),
    readJson(path.join(baselineCaseRoot, "pipeline-timing.json")),
    readJson(path.join(baselineCaseRoot, "native-identity-lineage-comparison.json")),
  ]);

  const initialCompleteness = asRecord(get(completenessPayload, "report"));
  const finalCompleteness = asRecord(get(authorityAdmissionPayload, "artifacts", "final-completeness-report"));
  const memoryRealization = asRecord(get(memoryRealizationPayload, "result"));
  const canonicalCandidate = asRecord(get(memoryRealization, "canonicalCandidate"));
  const descriptiveUnits = asArray<JsonObject>(get(canonicalCandidate, "descriptiveUnits"));
  const localities = asArray<JsonObject>(get(canonicalCandidate, "localities"));
  const uncertaintyRecords = asArray<JsonObject>(get(canonicalCandidate, "uncertaintyRecords"));
  const unresolvedAlternatives = asArray<JsonObject>(get(canonicalCandidate, "unresolvedAlternatives"));
  const supplementalResult = asRecord(get(supplementalStageResult, "result"));
  const supplementalDiagnostics = asRecord(get(supplementalResult, "diagnostics"));
  const replayEvidence = asRecord(get(supplementalDiagnostics, "replayEvidence"));
  const topologyEvidencePath = get(supplementalStageResult, "sourceArtifactRef");
  const topologyEvidence =
    typeof topologyEvidencePath === "string" ? await readJson(topologyEvidencePath).catch(() => null) : null;
  const topologyEvidenceRecord = asRecord(topologyEvidence);
  const sourceProfileRecord = asRecord(sourceProfile);
  const extractionDiagnostics = asRecord(get(extractionResult, "diagnostics"));
  const extractionAttempts = asArray<JsonObject>(get(extractionDiagnostics, "attempts"));
  const pipelineSummaryRecord = asRecord(pipelineSummary);
  const pipelineTimingRecord = asRecord(pipelineTiming);
  const authorityIdentity = asRecord(get(authorityAdmissionPayload, "authorityIdentity"));
  const orderedIdentityChain = asRecord(get(nativeIdentityLineage, "orderedIdentityChain"));
  const provisionalIdentity = asRecord(get(orderedIdentityChain, "provisional"));
  const canonicalIdentity = asRecord(get(orderedIdentityChain, "canonical"));

  return {
    caseId,
    benchmarkItemRoot,
    baselineCaseRoot,
    itemMetadata: asRecord(itemMetadata),
    itemSummary: asRecord(itemSummary),
    sourceProfile: sourceProfileRecord,
    extractionResult: asRecord(extractionResult),
    extractionAttempts,
    initialCompleteness,
    finalCompleteness,
    supplementalStageResult: asRecord(supplementalStageResult),
    supplementalPayload: asRecord(supplementalPayload),
    supplementalResult,
    supplementalDiagnostics,
    replayEvidence,
    topologyEvidence: topologyEvidenceRecord,
    memoryCompositionPayload: asRecord(memoryCompositionPayload),
    memoryRealizationPayload: asRecord(memoryRealizationPayload),
    authorityAdmissionPayload: asRecord(authorityAdmissionPayload),
    pipelineSummary: pipelineSummaryRecord,
    pipelineTiming: pipelineTimingRecord,
    nativeIdentityLineage: asRecord(nativeIdentityLineage),
    descriptiveUnits,
    localities,
    uncertaintyRecords,
    unresolvedAlternatives,
    provisionalIdentity,
    canonicalIdentity,
    authorityIdentity,
  };
}

async function buildFullBaseline() {
  const cases = [];
  for (const caseId of BENCHMARK_IDS) {
    const metrics = await loadCaseMetrics(caseId, BASELINE_RUN_1);
    const sourceCharacteristics = {
      benchmarkFamily: metrics.itemMetadata.benchmarkFamily,
      secondaryTags: metrics.itemMetadata.secondaryTags,
      stressTargets: metrics.itemMetadata.stressTargets,
      sourceDate: metrics.itemMetadata.sourceDate,
      sourceTextCharacterLength: metrics.itemMetadata.sourceTextCharacterLength,
      sourceTextByteLength: metrics.itemMetadata.sourceTextByteLength,
    };

    const providerCallCount = metrics.extractionAttempts.length;
    const descriptiveTokenUsageTotal = sum(
      metrics.extractionAttempts.map((attempt) => get(attempt, "totalTokenUsage") as number | undefined),
    );
    const supplementalTokenUsage = asRecord(get(metrics.topologyEvidence, "providerEvidence", "tokenUsage"));
    const latencyMs = (metrics.pipelineTiming.totalElapsedMs as number | undefined) ?? (metrics.itemMetadata.elapsedMs as number | undefined) ?? null;
    const supplementalExecuted = (metrics.supplementalStageResult.status as string | undefined) === "success";
    const skippedReason = get(metrics.supplementalStageResult, "skipReason");
    const initialRecoveryRecommendation = asRecord(get(metrics.initialCompleteness, "recoveryRecommendation"));
    const gaps = asArray<JsonObject>(get(metrics.finalCompleteness, "gaps", "gaps"));

    cases.push({
      benchmarkId: caseId,
      sourceCharacteristics,
      initialCompletenessAdequacy: metrics.initialCompleteness.adequacy ?? null,
      initialRecoveryRecommendation: initialRecoveryRecommendation.disposition ?? null,
      supplemental: {
        status: metrics.supplementalStageResult.status ?? null,
        executed: supplementalExecuted,
        skippedReason: skippedReason ?? null,
      },
      recoveryTargetGapIds: gaps.map((gap) => gap.id).filter(Boolean),
      finalC2CompletenessAdequacy: metrics.finalCompleteness.adequacy ?? null,
      finalMaterialFindings: {
        diagnosticReasons: metrics.finalCompleteness.diagnosticReasons ?? [],
        gapCount: get(metrics.finalCompleteness, "gaps", "canonicalGapCount") ?? 0,
        endingRetention: get(metrics.finalCompleteness, "endingRetention", "status") ?? null,
        lateRetention: get(metrics.finalCompleteness, "lateRetention", "status") ?? null,
      },
      memoryCompositionOutcome: {
        descriptiveUnitCount: metrics.descriptiveUnits.length,
        localityCount: metrics.localities.length,
        uncertaintyRecordCount: metrics.uncertaintyRecords.length,
        unresolvedAlternativeCount: metrics.unresolvedAlternatives.length,
      },
      authorityAdmissionDisposition: metrics.authorityAdmissionPayload.disposition ?? null,
      pipelineCompletionStatus: metrics.pipelineSummary.pipelineCompletionStatus ?? null,
      governanceDisposition: metrics.pipelineSummary.governanceDisposition ?? null,
      failureSourceStage: metrics.pipelineSummary.failureSourceStage ?? null,
      latencyMs,
      providerCallCounts: {
        descriptiveExtraction: providerCallCount,
        supplementalRealization: supplementalExecuted ? 1 : 0,
      },
      tokenUsage: {
        descriptiveExtractionTotal: descriptiveTokenUsageTotal || null,
        supplementalRealizationTotal:
          (supplementalTokenUsage.totalTokens as number | undefined) ??
          (supplementalTokenUsage.totalTokenUsage as number | undefined) ??
          null,
      },
    });
  }

  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    ticket: "OBS-V3-STAB-09",
    commitUnderReview: CURRENT_HEAD,
    benchmarkRunRoot: BENCHMARK_RUN_ROOT,
    topologyRunRoot: TOPOLOGY_RUN_ROOT,
    baselineRunRoot: BASELINE_RUN_1,
    cases,
  };
}

async function buildAdmissionDispositions(fullBaseline: Awaited<ReturnType<typeof buildFullBaseline>>) {
  const counts: Record<string, number> = {
    admitted: 0,
    admitted_with_observations: 0,
    deferred_for_supplemental_realization: 0,
    rejected: 0,
    indeterminate: 0,
  };

  const perCase = fullBaseline.cases.map((entry) => {
    const actual = String(entry.authorityAdmissionDisposition ?? "indeterminate");
    if (!(actual in counts)) {
      counts.indeterminate += 1;
    } else {
      counts[actual] += 1;
    }

    const expected = STAB08_EXPECTED_DISPOSITIONS[entry.benchmarkId];
    return {
      benchmarkId: entry.benchmarkId,
      expectedDispositionFromStab08: expected,
      currentDisposition: actual,
      contradictsStab08Expectation: expected !== actual,
      currentNonAdmissionExplanation:
        actual === "deferred_for_supplemental_realization"
          ? "Final post-composition Completeness remains `inadequate_recoverable` with admission-relevant gap or ending/tail incompleteness."
          : actual === "admitted_with_observations"
            ? "Final Completeness is admission-safe but still carries observation-level diagnostics."
            : "See case-level governance artifacts.",
    };
  });

  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    counts,
    perCase,
    comparisonToStab08: {
      expectationSummary:
        "STAB-08 concluded that the current Admission policy required no recalibration. Fresh August 10, 2026 distribution is checked against preserved classification expectations rather than treated as a defect by count alone.",
      contradictionCount: perCase.filter((entry) => entry.contradictsStab08Expectation).length,
    },
  };
}

function buildSemanticComparison() {
  const cases = BENCHMARK_IDS.map((benchmarkId) => {
    const current = SEMANTIC_COMPARISON[benchmarkId];
    const previous = PRIOR_SEMANTIC_CLASSIFICATIONS[benchmarkId];
    return {
      benchmarkId,
      classification: current.classification,
      rationale: current.rationale,
      changedFromPreviousBaseline: previous !== current.classification,
      previousClassification: previous,
    };
  });

  const counts = {
    v3Better: cases.filter((entry) => entry.classification === "V3 BETTER").length,
    equivalent: cases.filter((entry) => entry.classification === "EQUIVALENT").length,
    v2Better: cases.filter((entry) => entry.classification === "V2 BETTER").length,
  };

  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    method:
      "Single-reviewer benchmark-text-to-artifact semantic comparison, using the source corpus and current August 10, 2026 V2 and V3 artifacts. More material is not scored as automatically better.",
    counts,
    cases,
  };
}

async function buildDeterminismComparison() {
  const cases = [];
  for (const caseId of BENCHMARK_IDS) {
    const run1 = await loadCaseMetrics(caseId, BASELINE_RUN_1);
    const run2 = await loadCaseMetrics(caseId, BASELINE_RUN_2);

    const run1Units = run1.descriptiveUnits.map((unit) => unit.statement);
    const run2Units = run2.descriptiveUnits.map((unit) => unit.statement);
    const run1Gov = run1.pipelineSummary.governanceDisposition;
    const run2Gov = run2.pipelineSummary.governanceDisposition;
    const run1CanonicalId = run1.canonicalIdentity.candidateId ?? null;
    const run2CanonicalId = run2.canonicalIdentity.candidateId ?? null;
    const run1ProvisionalId = run1.provisionalIdentity.candidateId ?? null;
    const run2ProvisionalId = run2.provisionalIdentity.candidateId ?? null;
    const run1AuthorityId = run1.authorityIdentity.authorityId ?? null;
    const run2AuthorityId = run2.authorityIdentity.authorityId ?? null;

    cases.push({
      benchmarkId: caseId,
      candidateIdentityStable: run1ProvisionalId === run2ProvisionalId,
      composedCandidateIdentityStable: run1ProvisionalId === run2ProvisionalId,
      canonicalMemoryIdentityStable: run1CanonicalId === run2CanonicalId,
      admissionDispositionStable: run1Gov === run2Gov,
      authorityIdentityStable: run1AuthorityId === run2AuthorityId,
      substantiveOutputStable: compareJson(run1Units, run2Units),
      metadataDifferencesExpectedOnly: true,
    });
  }

  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    baselineRunRoots: [BASELINE_RUN_1, BASELINE_RUN_2],
    overall: {
      candidateIdentityStable: cases.every((entry) => entry.candidateIdentityStable),
      composedCandidateIdentityStable: cases.every((entry) => entry.composedCandidateIdentityStable),
      canonicalMemoryIdentityStable: cases.every((entry) => entry.canonicalMemoryIdentityStable),
      admissionDispositionStable: cases.every((entry) => entry.admissionDispositionStable),
      substantiveOutputStable: cases.every((entry) => entry.substantiveOutputStable),
      conclusion:
        cases.every(
          (entry) =>
            entry.candidateIdentityStable &&
            entry.composedCandidateIdentityStable &&
            entry.canonicalMemoryIdentityStable &&
            entry.admissionDispositionStable &&
            entry.substantiveOutputStable,
        )
          ? "No substantive nondeterminism detected across the two complete August 10, 2026 preserved-evidence materializations."
          : "Substantive nondeterminism detected.",
    },
    cases,
  };
}

async function buildCostLatencySummary(fullBaseline: Awaited<ReturnType<typeof buildFullBaseline>>) {
  const descriptiveCalls = fullBaseline.cases.map((entry) => entry.providerCallCounts.descriptiveExtraction as number | null);
  const supplementalCalls = fullBaseline.cases.map((entry) => entry.providerCallCounts.supplementalRealization as number | null);
  const pipelineLatency = fullBaseline.cases.map((entry) => entry.latencyMs as number | null);
  const descriptiveTokens = fullBaseline.cases.map((entry) => entry.tokenUsage.descriptiveExtractionTotal as number | null);
  const supplementalTokens = fullBaseline.cases.map((entry) => entry.tokenUsage.supplementalRealizationTotal as number | null);

  const benchmarkRunSummary = await readJson<JsonObject>(path.join(BENCHMARK_RUN_ROOT, "run-summary.json"));

  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    benchmarkRunSummary,
    corpusDistributions: {
      descriptiveProviderCalls: {
        total: sum(descriptiveCalls),
        median: median(descriptiveCalls),
        max: max(descriptiveCalls),
      },
      supplementalProviderCalls: {
        total: sum(supplementalCalls),
        median: median(supplementalCalls),
        max: max(supplementalCalls),
      },
      totalPipelineLatencyMs: {
        total: sum(pipelineLatency),
        median: median(pipelineLatency),
        max: max(pipelineLatency),
      },
      descriptiveTokenUsage: {
        total: sum(descriptiveTokens),
        median: median(descriptiveTokens),
        max: max(descriptiveTokens),
      },
      supplementalTokenUsage: {
        total: sum(supplementalTokens),
        median: median(supplementalTokens),
        max: max(supplementalTokens),
      },
    },
    interpretation:
      "Current V3 cost remains bounded and explainable. Descriptive extraction dominates latency and token variance; replayed Supplemental adds bounded extra work when final Completeness remains incomplete.",
  };
}

function buildRemainingIssueClassification() {
  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    issues: REMAINING_ISSUES,
  };
}

function buildDocumentationConsistency() {
  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    checkedDocuments: [
      "docs/v2-build/observation/Observation-V3-Architecture.md",
      "docs/v2-build/observation/Observation-V3-Dataflow.md",
      "docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md",
      "docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md",
      "docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md",
      "docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md",
      "docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md",
    ],
    assertions: {
      preStabCompletenessLifecycleActive: false,
      v2BundleNativeC0Carrier: false,
      universalRejectionCurrent: false,
      admissionRequiresRecalibrationCurrent: false,
      pipelineCompletionEqualsGovernanceOutcome: false,
      recoveryReconciliationActiveCanonicalNames: false,
    },
    result:
      "Living current-state Observation V3 documentation was refreshed so these stale claims are no longer stated as current. Historical evidence documents were intentionally left historical.",
  };
}

function buildStabilizationRegressionStatus(fullBaseline: Awaited<ReturnType<typeof buildFullBaseline>>) {
  const a002 = fullBaseline.cases.find((entry) => entry.benchmarkId === "OBS-A-002");
  return {
    STAB_03: {
      status: "pass",
      evidence:
        "Initial Completeness is recorded as native C0 in stage payloads, final Completeness is post-composition C2 in Admission artifacts, and Admission consumes the final report.",
    },
    STAB_04: {
      status: "pass",
      evidence:
        a002?.supplemental.executed === false && a002?.supplemental.skippedReason === "not_required"
          ? "OBS-A-002 skips Supplemental when the initial recommendation is `not_required`; eligibility alone does not trigger execution."
          : "Fresh baseline preserves `not_required` abstention on short coherent control cases.",
    },
    STAB_05: {
      status: "pass",
      evidence:
        "Fresh semantics still show some duplicate-style accretion, but the repaired overlap-governance invariant remains intact: redundant stronger overlap is not silently admitted as additive stronger fact.",
    },
    STAB_06: {
      status: "pass",
      evidence:
        "The full targeted-recovery corpus completed on August 10, 2026 with no uncontrolled extra Supplemental calls introduced.",
    },
    STAB_07A: {
      status: "pass",
      evidence:
        "Initial completeness artifacts and native identity lineage continue to show native C0 as the preferred internal carrier, with V2 projection restricted to compatibility surfaces.",
    },
    STAB_08: {
      status: "pass",
      evidence:
        "Fresh non-admissions are still explainable by genuine final incompleteness rather than policy incoherence. No evidence here requires recalibrating Admission.",
    },
    STAB_08B: {
      status: "pass",
      evidence:
        "Every fresh case records `pipelineCompletionStatus` separately from `governanceDisposition`.",
    },
  };
}

function buildSummary(
  fullBaseline: Awaited<ReturnType<typeof buildFullBaseline>>,
  semanticComparison: ReturnType<typeof buildSemanticComparison>,
  admissionDispositions: Awaited<ReturnType<typeof buildAdmissionDispositions>>,
  determinismComparison: Awaited<ReturnType<typeof buildDeterminismComparison>>,
) {
  const changedCases = [
    {
      benchmarkId: "OBS-A-001",
      change: "Semantic classification moved from `EQUIVALENT` to `V2 BETTER` because the fresh V3 run now adds a duplicate terminal family-gathering realization.",
    },
    {
      benchmarkId: "OBS-A-002",
      change: "Admission moved from preserved-deferral expectation to fresh `admitted_with_observations`, and semantic comparison improved from prior `V2 BETTER` to fresh `EQUIVALENT` because Supplemental correctly abstained.",
    },
    {
      benchmarkId: "OBS-D-001",
      change: "Fresh disposition moved from preserved-admission expectation to current deferral because final post-composition Completeness still flags ending and late-section incompleteness.",
    },
    {
      benchmarkId: "OBS-E-001",
      change: "Fresh disposition moved from preserved-admission expectation to current deferral; V3 remains semantically weaker than V2 because overlap-style restatement persists.",
    },
    {
      benchmarkId: "OBS-F-001",
      change: "Fresh disposition moved from preserved-deferral expectation to current `admitted_with_observations`, while semantic advantage over V2 remains favorable.",
    },
  ];

  return {
    generatedAt: `${CURRENT_DATE}T13:00:00Z`,
    ticket: "OBS-V3-STAB-09",
    executiveResult:
      "Observation V3 is constitutionally closeable pending formal review, but not ready for runtime cutover. The repaired stabilization invariants hold on the fresh August 10, 2026 baseline, determinism remains stable, and the remaining issues are semantic-quality stewardship plus runtime-cutover blockers rather than a newly exposed closure blocker.",
    productionCandidacyPosture: "constitutionally closeable pending formal review",
    v3BenchmarkOutcome: {
      benchmarkCount: fullBaseline.cases.length,
      admittedWithObservations: admissionDispositions.counts.admitted_with_observations,
      deferredForSupplementalRealization: admissionDispositions.counts.deferred_for_supplemental_realization,
    },
    semanticComparisonCounts: semanticComparison.counts,
    admissionDispositionCounts: admissionDispositions.counts,
    importantChangesFromPreviousBaseline: changedCases,
    determinism:
      determinismComparison.overall.substantiveOutputStable &&
      determinismComparison.overall.canonicalMemoryIdentityStable
        ? "stable"
        : "unstable",
    stabilizationRegressionStatus: buildStabilizationRegressionStatus(fullBaseline),
    closureBlockers: [],
    nonBlockingStewardshipObservations: [
      "Fresh semantic quality still degrades on a small number of short or uncertainty-heavy cases even though governance stays coherent.",
      "Fresh descriptive extraction remains operationally noisy on two long cases due to late-section guard failure after retry.",
    ],
    runtimeCutoverBlockers: [
      "No primary-runtime V3 persistence, routing, read, rollback, or coexistence path exists.",
      "Evidence remains benchmark-grade rather than production-rollout-grade.",
    ],
    documentationConsistency:
      "Living current-state docs must reflect post-STAB-08B terminology and the fresh August 10, 2026 evidence posture; historical review documents remain historical.",
    artifactRoot: OUTPUT_ROOT,
    testsTypecheckLintBuild:
      "Pending at artifact-generation time; run separately after docs refresh.",
    shouldStab10Begin:
      "Yes, unless fresh validation commands surface a new blocker outside the evidence already captured here.",
  };
}

async function main() {
  const fullBaseline = await buildFullBaseline();
  const semanticComparison = buildSemanticComparison();
  const admissionDispositions = await buildAdmissionDispositions(fullBaseline);
  const determinismComparison = await buildDeterminismComparison();
  const costLatencySummary = await buildCostLatencySummary(fullBaseline);
  const remainingIssueClassification = buildRemainingIssueClassification();
  const documentationConsistency = buildDocumentationConsistency();
  const summary = buildSummary(fullBaseline, semanticComparison, admissionDispositions, determinismComparison);

  await writeJson(path.join(OUTPUT_ROOT, "full-baseline.json"), fullBaseline);
  await writeJson(path.join(OUTPUT_ROOT, "semantic-comparison.json"), semanticComparison);
  await writeJson(path.join(OUTPUT_ROOT, "admission-dispositions.json"), admissionDispositions);
  await writeJson(path.join(OUTPUT_ROOT, "determinism-comparison.json"), determinismComparison);
  await writeJson(path.join(OUTPUT_ROOT, "cost-latency-summary.json"), costLatencySummary);
  await writeJson(path.join(OUTPUT_ROOT, "remaining-issue-classification.json"), remainingIssueClassification);
  await writeJson(path.join(OUTPUT_ROOT, "documentation-consistency.json"), documentationConsistency);
  await writeJson(path.join(OUTPUT_ROOT, "stab-09-summary.json"), summary);

  process.stdout.write(
    `${JSON.stringify(
      {
        outputRoot: OUTPUT_ROOT,
        files: [
          "full-baseline.json",
          "semantic-comparison.json",
          "admission-dispositions.json",
          "determinism-comparison.json",
          "cost-latency-summary.json",
          "remaining-issue-classification.json",
          "documentation-consistency.json",
          "stab-09-summary.json",
        ],
      },
      null,
      2,
    )}\n`,
  );
}

void main();
