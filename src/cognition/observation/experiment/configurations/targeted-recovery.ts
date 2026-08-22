import { buildCompletenessFromObservationBundle } from "@/src/cognition/observation/benchmark/observation-topology-experiment-metrics";
import { analyzeObservationCompleteness, type CompletenessAnalysisShadowResult } from "@/src/cognition/observation-v3/completeness-analysis";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
  ObservationTopologyConfigurationDefinition,
  ObservationTopologyConfigurationExecutionInput,
  ObservationTopologyExecutionResult,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { buildLlmSceneObservationExtraction } from "@/src/cognition/observation/llm-scene-observation-extractor";
import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import {
  buildExecutionSummary,
  buildStageRecord,
  createBundleFromRegions,
  EXPERIMENT_MODEL,
  sha256Hex,
} from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";
import {
  projectObservationBundleMaterial,
  selectBestParseableBaselineAttempt,
} from "@/src/cognition/observation/experiment/targeted-recovery-refinement";
import { runShadowMemoryComposition } from "@/src/cognition/observation-v3/memory-composition";
import {
  buildSupplementalRealizationArtifacts,
  runShadowSupplementalRealization,
  SUPPLEMENTAL_REALIZATION_SCHEMA,
} from "@/src/cognition/observation-v3/supplemental-realization";

function buildRecoveryArtifacts(input: {
  regions: ExperimentalRegion[];
  observations: ExperimentalObservationUnit[];
}) {
  return {
    regions: input.regions,
    observations: input.observations,
  };
}

export async function executeTargetedRecoveryConfiguration(
  input: ObservationTopologyConfigurationExecutionInput,
): Promise<ObservationTopologyExecutionResult> {
  const startedAt = new Date();
  const attempts: ObservationExtractionAttemptEvidence[] = [];
  const completenessAnalysis: CompletenessAnalysisShadowResult[] = [];
  const descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[] = [];
  const supplementalProviderEvidence: ObservationTopologyExecutionResult["supplementalProviderEvidence"] = [];
  const reflectiveObjectId = `experiment-${input.benchmarkId.toLowerCase()}-${input.repeatIndex}`;

  const baselineStartedAt = new Date();
  const extraction = await buildLlmSceneObservationExtraction({
    userId: "benchmark-runner",
    reflectiveObjectId,
    dreamText: input.dreamText,
    sourceIdentity: input.benchmarkId,
    extractionRequestId: `${input.benchmarkId}:descriptive-extraction`,
    onAttemptEvidence(evidence) {
      attempts.push(evidence);
    },
    onDescriptiveProviderEvidence(evidence) {
      descriptiveProviderEvidence.push(evidence);
    },
    onCompletenessAnalysis(result) {
      completenessAnalysis.push(result);
    },
  });
  const baselineCompletedAt = new Date();

  const stages = [
    buildStageRecord({
      stageId: "baseline-extraction",
      stageType: "baseline_extraction",
      order: 1,
      status: extraction.mode === "validated_llm" || attempts.length > 0 ? "success" : "failed",
      startedAt: baselineStartedAt,
      completedAt: baselineCompletedAt,
      provider: "openai",
      model: EXPERIMENT_MODEL,
      promptFingerprint: null,
      schemaFingerprint: null,
      diagnostics: extraction.diagnostics ? { extractionDiagnostics: extraction.diagnostics } : null,
      artifact: {
        extractionMode: extraction.mode,
        fallbackReason: extraction.reason ?? null,
      },
      tokenUsage: {
        input: null,
        output: null,
        total: null,
      },
    }),
  ];

  const selectedBaseline = selectBestParseableBaselineAttempt(attempts);
  const baselineProjection = selectedBaseline
    ? projectObservationBundleMaterial({
      bundle: selectedBaseline.bundle,
      admissionStatus: selectedBaseline.admissionStatus,
      source: "baseline",
    })
    : { regions: [], units: [] };

  const availableBaselineCompleteness = selectedBaseline?.bundle
    ? completenessAnalysis.find((result): result is Extract<CompletenessAnalysisShadowResult, { status: "available" }> =>
      result.status === "available" &&
      result.attemptNumber === selectedBaseline.attemptEvidence.attempt,
    )
    : null;
  const baselineCompleteness = selectedBaseline?.bundle
    ? availableBaselineCompleteness?.report ?? analyzeObservationCompleteness({
      dreamText: input.dreamText,
      bundle: selectedBaseline.bundle,
    })
    : null;

  const supplemental = baselineCompleteness && selectedBaseline
    ? await runShadowSupplementalRealization({
      sourceText: input.dreamText,
      completeness: baselineCompleteness,
      baseline: {
        candidateId: `baseline-${selectedBaseline.bundle.bundleId}`,
        candidateHash: baselineCompleteness.candidateIdentity.candidateHash,
        regions: baselineProjection.regions,
        units: baselineProjection.units,
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
      sourceIdentity: input.benchmarkId,
      onProviderEvidence(evidence: SupplementalRealizationProviderEvidence) {
        const providerMetadata = evidence.providerBoundary.providerMetadata as {
          targetId?: string;
          physicalGapId?: string;
        } | null;
        supplementalProviderEvidence?.push({
          requestId: evidence.attemptIdentity.supplementalRequestId ?? "supplemental-request",
          targetId: evidence.attemptIdentity.targetId ?? providerMetadata?.targetId ?? "unknown-target",
          physicalGapId: providerMetadata?.physicalGapId ?? null,
          providerAttemptNumber: evidence.attemptIdentity.targetExecutionAttempt ?? evidence.attemptIdentity.attemptNumber,
          retryParentAttemptIdentity: evidence.attemptIdentity.retryParentAttemptIdentity,
          evidence,
        });
      },
    })
    : null;

  const supplementalArtifacts = supplemental ? buildSupplementalRealizationArtifacts(supplemental) : null;
  const plannedTargets = supplemental?.plan.realizationContext ?? [];

  stages.push(buildStageRecord({
    stageId: "recovery-selection",
    stageType: "recovery_selection",
    order: 2,
    status: "success",
    startedAt: baselineCompletedAt,
    completedAt: baselineCompletedAt,
    provider: null,
    model: null,
    promptFingerprint: null,
    schemaFingerprint: null,
    diagnostics: {
      baselineAdmissionStatus: selectedBaseline?.admissionStatus ?? null,
      baselineAttemptStatus: selectedBaseline?.attemptEvidence.status ?? null,
      rawGapCount: baselineCompleteness?.gaps.gaps.length ?? 0,
      canonicalPhysicalGapCount: baselineCompleteness?.gaps.canonicalGapCount ?? 0,
      rawRecoveryWindowCount: plannedTargets.length,
      canonicalRecoveryWindowCount: plannedTargets.length,
      duplicateWindowsRemoved: 0,
    },
    artifact: {
      gaps: baselineCompleteness?.gaps.gaps ?? [],
      canonicalGaps: baselineCompleteness?.gaps.gaps ?? [],
      rawRecoveryWindows: plannedTargets,
      canonicalRecoveryWindows: plannedTargets,
      windowNormalization: [],
    },
    tokenUsage: {
      input: null,
      output: null,
      total: null,
    },
  }));

  const recoveredRegions: ExperimentalRegion[] = supplemental?.result.packages.flatMap((pkg) => pkg.regions) ?? [];
  const recoveredObservations: ExperimentalObservationUnit[] = supplemental?.result.packages.flatMap((pkg) => pkg.observations) ?? [];

  for (const [index, execution] of (supplemental?.result.execution ?? []).entries()) {
    const target = plannedTargets[index];
    stages.push(buildStageRecord({
      stageId: `recovery-extraction-${index + 1}`,
      stageType: "recovery_extraction",
      order: 3 + index,
      status: execution.packageId ? "success" : "failed",
      startedAt: baselineCompletedAt,
      completedAt: baselineCompletedAt,
      provider: "openai",
      model: EXPERIMENT_MODEL,
      promptFingerprint: null,
      schemaFingerprint: sha256Hex(JSON.stringify(SUPPLEMENTAL_REALIZATION_SCHEMA)),
      diagnostics: {
        providerStatus: execution.providerStatus,
        providerIncompleteReason: execution.providerIncompleteReason,
        canonicalRecoveryWindowId: target?.targetId ?? null,
        physicalGapId: target?.physicalGapId ?? null,
        contributingReasons: target?.reasons ?? [],
        recoveredRegionCount: supplemental?.result.packages[index]?.regions.length ?? 0,
        recoveredObservationCount: supplemental?.result.packages[index]?.observations.length ?? 0,
      },
      artifact: execution.structured as unknown as Record<string, unknown>,
      tokenUsage: execution.tokenUsage,
    }));
  }

  const reconciliationStartedAt = new Date();
  const composition = runShadowMemoryComposition({
    dreamTextLength: input.dreamText.length,
    baseline: {
      regions: baselineProjection.regions,
      units: baselineProjection.units,
    },
    supplemental: {
      regions: recoveredRegions,
      units: recoveredObservations.map((unit) => ({
        ...unit,
        admissionStatus: "accepted" as const,
      })),
    },
  });
  const reconciliation = composition.result.legacyReconciliation;
  const mergedBundle = createBundleFromRegions({
    reflectiveObjectId,
    userId: "benchmark-runner",
    regions: reconciliation.finalRegions,
    observations: reconciliation.finalUnits,
    source: "system_llm_extract",
    dreamLanguage: selectedBaseline?.bundle.provenance?.dreamLanguage ?? extraction.bundle?.provenance?.dreamLanguage ?? "unknown",
    maximumSpanEnd: input.dreamText.length,
  });
  const reconciliationCompletedAt = new Date();

  stages.push(buildStageRecord({
    stageId: "reconciliation",
    stageType: "reconciliation",
    order: 3 + plannedTargets.length,
    status: "success",
    startedAt: reconciliationStartedAt,
    completedAt: reconciliationCompletedAt,
    provider: null,
    model: null,
    promptFingerprint: null,
    schemaFingerprint: null,
    diagnostics: {
      duplicateCandidatePairs: reconciliation.duplicateAnalysis.length,
      duplicateResolutionCount: reconciliation.duplicateResolution.length,
      replacedUnits: reconciliation.replacementDecisions.length,
      unresolvedOverlaps: reconciliation.unresolvedOverlaps.length,
      duplicateLocalitiesMerged: reconciliation.localityMergeDecisions.length,
      localityCount: reconciliation.finalRegions.length,
      outOfOrderUnitCount: reconciliation.sourceOrderAssembly.outOfOrderUnitCount,
      outOfOrderLocalityCount: reconciliation.sourceOrderAssembly.outOfOrderLocalityCount,
    },
    artifact: {
      finalRegionCount: reconciliation.finalRegions.length,
      finalObservationCount: reconciliation.finalUnits.length,
      finalLocalityOrderValid: reconciliation.sourceOrderAssembly.finalLocalityOrderValid,
    },
    tokenUsage: {
      input: null,
      output: null,
      total: null,
    },
  }));

  const completedAt = new Date();
  const completeness = buildCompletenessFromObservationBundle({
    bundle: mergedBundle,
    dreamText: input.dreamText,
  });
  const finalRepresentation = {
    kind: "scene_bundle" as const,
    bundle: mergedBundle,
  };
  const retainedBaselineCount = reconciliation.finalUnits.filter((unit) => unit.origin === "baseline").length;
  const retainedRecoveryCount = reconciliation.finalUnits.filter((unit) => unit.origin !== "baseline").length;
  const baselineRetainedSpan = reconciliation.finalUnits
    .filter((unit) => unit.origin === "baseline")
    .flatMap((unit) => unit.evidence.map((evidence) => evidence.spanEnd ?? evidence.spanStart ?? 0));
  const recoveryRetainedSpan = reconciliation.finalUnits
    .filter((unit) => unit.origin !== "baseline")
    .flatMap((unit) => unit.evidence.map((evidence) => evidence.spanEnd ?? evidence.spanStart ?? 0));
  const success = reconciliation.finalUnits.length > 0;

  const reconciliationDiagnostics = {
    baselineAdmissionStatus: selectedBaseline?.admissionStatus ?? null,
    rawGapCount: baselineCompleteness?.gaps.gaps.length ?? 0,
    canonicalPhysicalGapCount: baselineCompleteness?.gaps.canonicalGapCount ?? 0,
    rawRecoveryWindowCount: plannedTargets.length,
    canonicalRecoveryWindowCount: plannedTargets.length,
    duplicateWindowsRemoved: 0,
    baselineUnitRetention: {
      total: baselineProjection.units.length,
      retained: retainedBaselineCount,
    },
    recoveryUnitRetention: {
      total: recoveredObservations.length,
      retained: retainedRecoveryCount,
    },
    duplicateCandidatePairs: reconciliation.duplicateAnalysis.length,
    confirmedDuplicatesRemoved: reconciliation.duplicateResolution.filter((entry) => entry.classification === "confirmed_duplicate").length,
    partialOverlapsRetained: reconciliation.unresolvedOverlaps.filter((entry) => entry.classification === "partial_overlap").length,
    conflictsRetained: reconciliation.unresolvedOverlaps.filter((entry) => entry.classification === "conflict").length,
    unresolvedOverlaps: reconciliation.unresolvedOverlaps.length,
    replacedUnits: reconciliation.replacementDecisions.length,
    duplicateLocalitiesMerged: reconciliation.localityMergeDecisions.length,
    recoveredSourceSpan: recoveryRetainedSpan.length > 0 ? Math.max(...recoveryRetainedSpan) : 0,
    retainedBaselineSourceSpan: baselineRetainedSpan.length > 0 ? Math.max(...baselineRetainedSpan) : 0,
    uncoveredPrefix: reconciliation.uncoveredPrefix,
    uncoveredTail: reconciliation.uncoveredTail,
    internalGapCount: reconciliation.internalGaps.length,
    localityCount: reconciliation.finalRegions.length,
    finalLocalityOrderValid: reconciliation.sourceOrderAssembly.finalLocalityOrderValid,
    outOfOrderUnitCount: reconciliation.sourceOrderAssembly.outOfOrderUnitCount,
    outOfOrderLocalityCount: reconciliation.sourceOrderAssembly.outOfOrderLocalityCount,
    repeatedSourceSpanRealizationCount: reconciliation.sourceOrderAssembly.repeatedSourceSpanRealizationCount,
    endingRetained: completeness.endingRetention,
    earliestRepresentedPosition: reconciliation.earliestRepresentedPosition,
    latestRepresentedPosition: reconciliation.latestRepresentedPosition,
  };

  const result: ObservationTopologyExecutionResult = {
    benchmarkId: input.benchmarkId,
    configurationId: "C_TARGETED_RECOVERY",
    repeatIndex: input.repeatIndex,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    elapsedMs: completedAt.getTime() - startedAt.getTime(),
    success,
    provider: "openai",
    model: EXPERIMENT_MODEL,
    promptFingerprint: sha256Hex(JSON.stringify({
      plannedTargets,
      schema: SUPPLEMENTAL_REALIZATION_SCHEMA,
    })),
    schemaFingerprint: sha256Hex(JSON.stringify(SUPPLEMENTAL_REALIZATION_SCHEMA)),
    topologyImplementationFingerprint: input.topologyImplementationFingerprint,
    sourceFingerprint: input.sourceFingerprint,
    stages,
    attempts,
    descriptiveProviderEvidence,
    supplementalProviderEvidence,
    finalRepresentation,
    completeness,
    diagnostics: reconciliationDiagnostics,
    artifacts: {
      "completeness-shadow": {
        attempts: completenessAnalysis,
      },
      "gap-analysis": baselineCompleteness?.gaps.gaps ?? [],
      "canonical-gaps": baselineCompleteness?.gaps.gaps ?? [],
      "recovery-windows": plannedTargets,
      "window-normalization": [],
      "canonical-recovery-windows": plannedTargets,
      "baseline-units": {
        admissionStatus: selectedBaseline?.admissionStatus ?? null,
        ...baselineProjection,
      },
      "recovery-units": buildRecoveryArtifacts({
        regions: recoveredRegions,
        observations: recoveredObservations,
      }),
      "recovery-unit-provenance": recoveredObservations.map((observation) => ({
        observationId: observation.observationId,
        regionId: observation.regionId,
        recoveryProvenance: observation.recoveryProvenance ?? null,
      })),
      ...(supplementalArtifacts ?? {}),
      ...composition.artifacts,
      "duplicate-analysis": reconciliation.duplicateAnalysis,
      "duplicate-resolution": reconciliation.duplicateResolution,
      "replacement-decisions": reconciliation.replacementDecisions,
      "locality-decisions": reconciliation.finalRegions,
      "locality-overlap-analysis": reconciliation.localityOverlapAnalysis,
      "locality-merge-decisions": reconciliation.localityMergeDecisions,
      "source-order-assembly": reconciliation.sourceOrderAssembly,
      "reconciliation-result": {
        finalRegions: reconciliation.finalRegions,
        finalUnits: reconciliation.finalUnits,
      },
      "reconciliation-diagnostics": reconciliationDiagnostics,
      "final-candidate": finalRepresentation,
    },
    summary: buildExecutionSummary({
      benchmarkId: input.benchmarkId,
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: input.repeatIndex,
      success,
      finalRepresentation,
      completeness,
      stages,
      attempts,
      elapsedMs: completedAt.getTime() - startedAt.getTime(),
      failureReason: success ? null : "targeted_recovery_produced_no_candidate",
      anonymizedCandidateLabel: input.anonymizedCandidateLabel,
    }),
  };

  return result;
}

export const targetedRecoveryConfiguration: ObservationTopologyConfigurationDefinition = {
  configurationId: "C_TARGETED_RECOVERY",
  execute: executeTargetedRecoveryConfiguration,
};
