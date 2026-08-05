import { createHash } from "node:crypto";

import {
  buildCompletenessFromLayeredBundle,
  buildCompletenessFromObservationBundle,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-metrics";
import type {
  ExperimentalCompletenessMetadata,
  ExperimentalEvidenceSpan,
  ExperimentalObservationBundle,
  ExperimentalObservationUnit,
  ExperimentalRegion,
  ExperimentalTransition,
  ObservationTopologyExecutionResult,
  ObservationTopologyFinalRepresentation,
  ObservationTopologyStageRecord,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import type { ObservationV2Bundle, ObservationV2EvidenceRef, ObservationV2Scene } from "@/src/domain/observation/v2-runtime";

export const EXPERIMENT_MODEL = "gpt-4.1-mini";
export const EXPERIMENT_TIMEOUT_MS = 180_000;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function nowIso(date = new Date()): string {
  return date.toISOString();
}

export function buildStageRecord(input: Omit<ObservationTopologyStageRecord, "startedAt" | "completedAt" | "elapsedMs"> & {
  startedAt: Date;
  completedAt: Date;
}): ObservationTopologyStageRecord {
  return {
    ...input,
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    elapsedMs: input.completedAt.getTime() - input.startedAt.getTime(),
  };
}

export function toExperimentalEvidenceRef(evidence: ObservationV2EvidenceRef): ExperimentalEvidenceSpan {
  return {
    snippet: evidence.snippet,
    spanStart: evidence.spanStart,
    spanEnd: evidence.spanEnd,
    contextLabel: evidence.contextLabel,
  };
}

export function clampSpanStart(value: number, minimum = 0): number {
  return Math.max(minimum, value);
}

export function clampSpanEnd(value: number, maximum: number): number {
  return Math.min(value, maximum);
}

export function shiftEvidenceToAbsolute(
  evidence: ExperimentalEvidenceSpan[],
  offset: number,
  maximumSpanEnd?: number,
): ExperimentalEvidenceSpan[] {
  return evidence.map((entry) => ({
    ...entry,
    spanStart: entry.spanStart === null
      ? null
      : clampSpanStart(maximumSpanEnd === undefined ? entry.spanStart + offset : Math.min(entry.spanStart + offset, maximumSpanEnd)),
    spanEnd: entry.spanEnd === null
      ? null
      : maximumSpanEnd === undefined
        ? entry.spanEnd + offset
        : Math.min(entry.spanEnd + offset, maximumSpanEnd),
  }));
}

export function buildEmptyDerived() {
  return {
    actors: [],
    locations: [],
    objects: [],
    interactions: [],
    affect: [],
    agency: [],
    phenomenology: [],
    metacognition: [],
  };
}

export function createBundleFromRegions(input: {
  reflectiveObjectId: string;
  userId: string;
  regions: ExperimentalRegion[];
  observations: ExperimentalObservationUnit[];
  source: ObservationV2Bundle["source"];
  dreamLanguage?: "hu" | "en" | "unknown";
  maximumSpanEnd?: number;
}): ObservationV2Bundle {
  const orderedRegions = [...input.regions].sort((left, right) => left.order - right.order);
  const scenes: ObservationV2Scene[] = orderedRegions.map((region, index) => ({
    sceneId: region.regionId,
    position: index,
    summary: region.heading ?? `Region ${index + 1}`,
    boundaryReasoning: region.transitionCues.map((cue) => ({
      kind: "narrative_change" as const,
      note: cue,
    })),
    uncertaintyNotes: region.uncertainty ? [region.uncertainty] : [],
    evidenceContext: region.evidence[0]
      ? {
          snippet: region.evidence[0].snippet,
          spanStart: region.evidence[0].spanStart === null
            ? null
            : clampSpanStart(
                input.maximumSpanEnd === undefined
                  ? region.evidence[0].spanStart
                  : Math.min(region.evidence[0].spanStart, input.maximumSpanEnd),
              ),
          spanEnd: region.evidence[0].spanEnd === null
            ? null
            : input.maximumSpanEnd === undefined
              ? region.evidence[0].spanEnd
              : Math.min(region.evidence[0].spanEnd, input.maximumSpanEnd),
          contextLabel: region.evidence[0].contextLabel,
        }
      : {
          snippet: "",
          spanStart: region.spanStart === null
            ? null
            : clampSpanStart(input.maximumSpanEnd === undefined ? region.spanStart : Math.min(region.spanStart, input.maximumSpanEnd)),
          spanEnd: region.spanEnd === null
            ? null
            : input.maximumSpanEnd === undefined
              ? region.spanEnd
              : Math.min(region.spanEnd, input.maximumSpanEnd),
          contextLabel: "region",
        },
    observations: input.observations
      .filter((observation) => observation.regionId === region.regionId)
      .map((observation, observationIndex) => ({
        observationId: observation.observationId,
        position: observationIndex,
        text: observation.statement,
        evidence: observation.evidence.map((evidence) => ({
          snippet: evidence.snippet,
          spanStart: evidence.spanStart === null
            ? null
            : clampSpanStart(input.maximumSpanEnd === undefined ? evidence.spanStart : Math.min(evidence.spanStart, input.maximumSpanEnd)),
          spanEnd: evidence.spanEnd === null
            ? null
            : input.maximumSpanEnd === undefined
              ? evidence.spanEnd
              : Math.min(evidence.spanEnd, input.maximumSpanEnd),
          contextLabel: evidence.contextLabel,
        })),
        uncertaintyNote: observation.uncertainty,
      })),
    derived: buildEmptyDerived(),
  }));

  return createSceneDiscoveryBundle({
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: input.source,
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["experimental_topology"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_experiment",
      dreamLanguage: input.dreamLanguage ?? "unknown",
    },
    scenes,
  });
}

export function buildLayeredBundle(input: {
  bundleId: string;
  sourceDreamHash: string;
  configurationId: ObservationTopologyExecutionResult["configurationId"];
  sourceFingerprint: string;
  provider: string | null;
  model: string | null;
  regions: ExperimentalRegion[];
  observations: ExperimentalObservationUnit[];
  transitions: ExperimentalTransition[];
  uncertainty: string[];
  dreamText: string;
}): ExperimentalObservationBundle {
  const layered: ExperimentalObservationBundle = {
    kind: "layered_bundle",
    bundleId: input.bundleId,
    sourceDreamHash: input.sourceDreamHash,
    regions: input.regions,
    observations: input.observations,
    transitions: input.transitions,
    uncertainty: input.uncertainty,
    completeness: {
      sourceCoverageRatio: null,
      lateSectionRetention: {
        observed: 0,
        thresholdStart: Math.floor(input.dreamText.length * 0.75),
        retained: false,
      },
      endingRetention: false,
      transitionCoverage: {
        total: input.transitions.length,
        withEvidence: input.transitions.filter((transition) => transition.evidence.length > 0).length,
      },
      regionCoverage: {
        total: input.regions.length,
        covered: 0,
      },
      uncertaintyPreserved: input.uncertainty.length > 0,
      knownIncompleteRegions: [],
      structuralCompleteness: "partial",
    },
    provenance: {
      configurationId: input.configurationId,
      provider: input.provider,
      model: input.model,
      sourceFingerprint: input.sourceFingerprint,
    },
  };

  layered.completeness = buildCompletenessFromLayeredBundle({
    bundle: layered,
    dreamText: input.dreamText,
  });

  return layered;
}

export function buildExecutionSummary(input: {
  benchmarkId: string;
  configurationId: ObservationTopologyExecutionResult["configurationId"];
  repeatIndex: number;
  success: boolean;
  finalRepresentation: ObservationTopologyFinalRepresentation | null;
  completeness: ExperimentalCompletenessMetadata | null;
  stages: ObservationTopologyStageRecord[];
  attempts: ObservationExtractionAttemptEvidence[];
  elapsedMs: number;
  failureReason: string | null;
  anonymizedCandidateLabel: string;
}): ObservationTopologyExecutionResult["summary"] {
  const finalRepresentation = input.finalRepresentation;
  let sceneOrRegionCount = 0;
  let observationCount = 0;
  let transitionCount = 0;
  let evidenceSpanCoverage: number | null = null;
  let structuralCompleteness: "complete" | "partial" | "incomplete" = "incomplete";

  if (finalRepresentation?.kind === "scene_bundle") {
    const bundle = finalRepresentation.bundle;
    const completeness = input.completeness ?? buildCompletenessFromObservationBundle({
      bundle,
      dreamText: "",
    });
    sceneOrRegionCount = bundle.scenes.length;
    observationCount = bundle.scenes.reduce((sum, scene) => sum + scene.observations.length, 0);
    evidenceSpanCoverage = completeness.sourceCoverageRatio;
    structuralCompleteness = completeness.structuralCompleteness;
  } else if (finalRepresentation?.kind === "layered_bundle") {
    const bundle = finalRepresentation.bundle;
    sceneOrRegionCount = bundle.regions.length;
    observationCount = bundle.observations.length;
    transitionCount = bundle.transitions.length;
    evidenceSpanCoverage = bundle.completeness.sourceCoverageRatio;
    structuralCompleteness = bundle.completeness.structuralCompleteness;
  }

  return {
    benchmarkId: input.benchmarkId,
    configurationId: input.configurationId,
    repeatIndex: input.repeatIndex,
    success: input.success,
    sceneOrRegionCount,
    observationCount,
    transitionCount,
    evidenceSpanCoverage,
    lateSectionRetention: input.completeness?.lateSectionRetention.retained ?? false,
    endingRetention: input.completeness?.endingRetention ?? false,
    retryOrStageCount: Math.max(input.stages.length, input.attempts.length),
    tokenUsageTotal: input.stages.reduce((sum, stage) => sum + (stage.tokenUsage.total ?? 0), 0) || null,
    elapsedMs: input.elapsedMs,
    structuralCompleteness,
    artifactAvailable: finalRepresentation !== null,
    finalStatus: input.success ? "success" : "failed",
    failureReason: input.failureReason,
    anonymizedCandidateLabel: input.anonymizedCandidateLabel,
  };
}

export function dedupeRecoveredObservations(
  existing: ExperimentalObservationUnit[],
  additions: ExperimentalObservationUnit[],
): { observations: ExperimentalObservationUnit[]; conflicts: Array<Record<string, unknown>> } {
  const bySignature = new Map<string, ExperimentalObservationUnit>();
  const conflicts: Array<Record<string, unknown>> = [];

  for (const observation of existing) {
    const firstEvidence = observation.evidence[0];
    const signature = `${observation.statement}|${firstEvidence?.spanStart ?? "null"}|${firstEvidence?.spanEnd ?? "null"}`;
    bySignature.set(signature, observation);
  }

  for (const observation of additions) {
    const firstEvidence = observation.evidence[0];
    const signature = `${observation.statement}|${firstEvidence?.spanStart ?? "null"}|${firstEvidence?.spanEnd ?? "null"}`;
    const existingObservation = bySignature.get(signature);
    if (!existingObservation) {
      bySignature.set(signature, observation);
      continue;
    }

    if (existingObservation.source !== observation.source) {
      conflicts.push({
        type: "duplicate_signature_different_source",
        existingObservationId: existingObservation.observationId,
        incomingObservationId: observation.observationId,
      });
    }
  }

  return {
    observations: [...bySignature.values()].sort((left, right) => {
      const leftStart = left.evidence[0]?.spanStart ?? Number.MAX_SAFE_INTEGER;
      const rightStart = right.evidence[0]?.spanStart ?? Number.MAX_SAFE_INTEGER;
      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }

      return left.order - right.order;
    }),
    conflicts,
  };
}
