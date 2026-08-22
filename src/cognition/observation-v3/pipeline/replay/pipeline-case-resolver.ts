import fs from "node:fs/promises";
import path from "node:path";

import type { ObservationV3ReplayMatrixCase } from "@/src/cognition/observation-v3/pipeline/replay/replay-types";
import {
  classifyReplayLineage,
} from "@/src/cognition/observation-v3/pipeline/replay/artifact-lineage-resolver";
import {
  loadPreservedExtractionReplayEvidence,
  type LoadedSupplementalReplayEvidence,
  loadPreservedSupplementalReplayEvidence,
} from "@/src/cognition/observation-v3/pipeline/replay/preserved-case-loader";

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function repeatDirectoryName(repeat: number): string {
  return `repeat-${String(repeat).padStart(2, "0")}`;
}

async function findTopologyRepeatDirectories(input: {
  topologyRoots: string[];
  benchmarkId: string;
  repeat: number;
}): Promise<string[]> {
  const targetSuffix = path.join("items", input.benchmarkId, "C_TARGETED_RECOVERY", repeatDirectoryName(input.repeat));
  const results: string[] = [];

  for (const topologyRoot of input.topologyRoots) {
    const candidate = path.join(topologyRoot, targetSuffix);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        results.push(candidate);
      }
    } catch {
      continue;
    }
  }

  return results.sort((left, right) => right.localeCompare(left));
}

export interface ResolvedObservationV3ReplayCase {
  benchmarkId: string;
  runId: string | null;
  classification: import("@/src/cognition/observation-v3/pipeline/replay/replay-types").ObservationV3ReplayCompatibilityClassification;
  selectionReason: string;
  failure: import("@/src/cognition/observation-v3/pipeline/replay/replay-types").ObservationV3ReplayFailure | null;
  lineage: Record<string, unknown>;
  compatibility: Record<string, unknown>;
  pipelineInput: import("@/src/cognition/observation-v3/pipeline/shadow-pipeline").ObservationV3ShadowPipelineInput | null;
}

export async function resolveObservationV3ReplayCase(input: {
  caseItem: ObservationV3ReplayMatrixCase;
  baselineBenchmarkRoots: string[];
  completenessRoots: string[];
  topologyRoots: string[];
}): Promise<ResolvedObservationV3ReplayCase> {
  const candidates: ResolvedObservationV3ReplayCase[] = [];

  const completenessBackedRuns: Array<{
    runId: string;
    repeat: number;
    itemDirectory: string;
  }> = [];

  for (const completenessRoot of input.completenessRoots) {
    const summary = await readJson<{
      runRecords?: Array<{
        benchmarkId: string;
        repeat: number;
        runId: string;
        artifactDirectory: string;
      }>;
    }>(path.join(completenessRoot, "calibration-summary.json"));

    for (const runRecord of (summary.runRecords ?? []).filter((entry) => entry.benchmarkId === input.caseItem.benchmarkId)) {
      completenessBackedRuns.push({
        runId: runRecord.runId,
        repeat: runRecord.repeat,
        itemDirectory: path.resolve(runRecord.artifactDirectory, "items", input.caseItem.benchmarkId),
      });
    }
  }

  for (const baselineRoot of input.baselineBenchmarkRoots) {
    const itemDirectory = path.resolve(baselineRoot, "items", input.caseItem.benchmarkId);
    try {
      const stat = await fs.stat(itemDirectory);
      if (stat.isDirectory()) {
        completenessBackedRuns.push({
          runId: path.basename(baselineRoot),
          repeat: 1,
          itemDirectory,
        });
      }
    } catch {
      continue;
    }
  }

  for (const runRecord of completenessBackedRuns) {
      const itemDirectory = runRecord.itemDirectory;
      const itemSummary = await readJson<{ acceptedAttempt?: number | null }>(path.join(itemDirectory, "item-summary.json"));
      const attemptNumber = itemSummary.acceptedAttempt ?? 1;
      const attemptDirectory = path.join(itemDirectory, "attempts", `attempt-${String(attemptNumber).padStart(2, "0")}`);
      const supplementalRequirement = await loadSupplementalRequirement({
        attemptDirectory,
        itemDirectory,
      });

      let extractionEvidence = null;
      let extractionCorrupt = false;
      try {
        extractionEvidence = await loadPreservedExtractionReplayEvidence({
          attemptDirectory,
        });
      } catch {
        extractionCorrupt = true;
      }

      const topologyRepeatDirectories = await findTopologyRepeatDirectories({
        topologyRoots: input.topologyRoots,
        benchmarkId: input.caseItem.benchmarkId,
        repeat: runRecord.repeat,
      });
      const selectedTopology = await selectTopologyReplayCandidate({
        caseItem: input.caseItem,
        topologyRepeatDirectories,
        supplementalRequirement,
      });
      const topologyExtractionEvidence = selectedTopology
        ? await loadTopologyExtractionReplayEvidence({
          repeatDirectory: selectedTopology.repeatDirectory,
        })
        : null;
      const topologyRepeatDirectory = selectedTopology?.repeatDirectory ?? null;
      const supplementalEvidence = selectedTopology?.supplementalEvidence ?? [];
      const supplementalCorrupt = selectedTopology?.supplementalCorrupt ?? false;
      const supplementalRequired = supplementalRequirement.required;
      const benchmarkLineageResolution = classifyReplayLineage({
        extractionAvailable: extractionEvidence !== null && extractionEvidence.providerResult.outputText !== null,
        extractionRawPreserved: extractionEvidence?.rawProviderResponsePreserved ?? false,
        extractionCorrupt,
        supplementalRequired,
        supplementalAvailable: selectedTopology?.satisfiesSupplementalRequirement ?? (!supplementalRequired),
        supplementalCorrupt,
      });
      const topologyLineageResolution = topologyExtractionEvidence
        ? classifyReplayLineage({
          extractionAvailable: topologyExtractionEvidence.providerResult.outputText !== null,
          extractionRawPreserved: topologyExtractionEvidence.rawProviderResponsePreserved,
          extractionCorrupt: false,
          supplementalRequired: supplementalEvidence.length > 0,
          supplementalAvailable: supplementalEvidence.every((entry) => entry.providerResult.outputText !== null),
          supplementalCorrupt,
        })
        : null;
      const useTopologyExtraction =
        benchmarkLineageResolution.classification !== "fully_replayable"
        && topologyLineageResolution?.classification === "fully_replayable";
      const activeExtractionEvidence = useTopologyExtraction ? topologyExtractionEvidence : extractionEvidence;
      const lineageResolution = useTopologyExtraction && topologyLineageResolution
        ? topologyLineageResolution
        : benchmarkLineageResolution;

      candidates.push({
        benchmarkId: input.caseItem.benchmarkId,
        runId: runRecord.runId,
        classification: lineageResolution.classification,
        selectionReason: selectedTopology
          ? `selected_by_repeat_${runRecord.repeat}:${selectedTopology.selectionReason}${useTopologyExtraction ? ":coherent_topology_extraction" : ""}`
          : `selected_by_repeat_${runRecord.repeat}:no_topology_root`,
        failure: lineageResolution.failure,
        lineage: {
          repeat: runRecord.repeat,
          extractionAttemptNumber: activeExtractionEvidence?.attemptNumber ?? attemptNumber,
          extractionSource: useTopologyExtraction ? "topology_root" : "benchmark_root",
          topologyRepeatDirectory,
          topologySourceFingerprint: selectedTopology?.sourceFingerprint ?? null,
          topologySelectedRunId: selectedTopology?.runId ?? null,
          requiredPhysicalGapIds: supplementalRequirement.requiredPhysicalGapIds,
          ...lineageResolution.lineage,
        },
        compatibility: {
          extractionProviderBoundaryPreserved: activeExtractionEvidence?.rawProviderResponsePreserved ?? false,
          supplementalProviderBoundaryPreserved: supplementalRequired
            ? selectedTopology?.satisfiesSupplementalRequirement ?? false
            : true,
        },
        pipelineInput: lineageResolution.classification === "fully_replayable" && activeExtractionEvidence
          ? {
              userId: "observation-v3-replay-runner",
              reflectiveObjectId: `replay-${input.caseItem.benchmarkId.toLowerCase()}`,
              dreamText: input.caseItem.dreamText,
              sourceIdentity: {
                sourceId: `source-${input.caseItem.sourceHash.slice(0, 12)}`,
                sourceHash: input.caseItem.sourceHash,
                sourceLength: input.caseItem.sourceLength,
              },
              replay: {
                adapterId: "observation-v3-preserved-replay-v1",
                descriptiveExtraction: {
                  attemptId: `${useTopologyExtraction ? selectedTopology?.runId ?? runRecord.runId : runRecord.runId}:attempt-${String(activeExtractionEvidence.attemptNumber).padStart(2, "0")}`,
                  attemptNumber: activeExtractionEvidence.attemptNumber === 2 ? 2 : 1,
                  sourceArtifactRef: activeExtractionEvidence.sourceArtifactRef,
                  providerResult: activeExtractionEvidence.providerResult,
                },
                supplementalRealization: supplementalEvidence.length > 0
                  ? {
                      responses: supplementalEvidence.map((entry) => ({
                        physicalGapId: entry.physicalGapId,
                        targetContract: entry.targetContract,
                        sourceArtifactRef: entry.sourceArtifactRef,
                        providerResult: entry.providerResult,
                      })),
                    }
                  : undefined,
              },
            }
          : null,
      });
  }

  const ranking = new Map([
    ["fully_replayable", 0],
    ["replayable_with_representation_difference", 1],
    ["replayable_with_contract_difference", 2],
    ["requires_manual_mapping", 3],
    ["artifact_incomplete", 4],
    ["lineage_broken", 5],
    ["unsupported", 6],
  ]);

  const selected = [...candidates].sort((left, right) =>
    (ranking.get(left.classification) ?? 99) - (ranking.get(right.classification) ?? 99)
    || (right.runId ?? "").localeCompare(left.runId ?? "")
  )[0];

  if (selected) {
    return selected;
  }

  return {
    benchmarkId: input.caseItem.benchmarkId,
    runId: null,
    classification: "unsupported",
    selectionReason: "no_completeness_run_record_found",
    failure: {
      classification: "missing_lineage",
      message: "no_completeness_run_record_found",
      sourceArtifactRef: null,
    },
    lineage: {},
    compatibility: {},
    pipelineInput: null,
  };
}

async function loadSupplementalRequirement(input: {
  attemptDirectory: string;
  itemDirectory: string;
}): Promise<{
  required: boolean;
  requiredPhysicalGapIds: string[];
}> {
  const candidatePaths = [
    path.join(input.attemptDirectory, "completeness-report.json"),
    path.join(input.itemDirectory, "completeness-report.json"),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      const report = await readJson<{
        report?: {
          recoveryRecommendation?: {
            targetedPhysicalGapIds?: string[];
            eligibility?: string;
          };
        };
        recoveryRecommendation?: {
          targetedPhysicalGapIds?: string[];
          eligibility?: string;
        };
      }>(candidatePath);
      const recommendation = report.report?.recoveryRecommendation ?? report.recoveryRecommendation;
      const requiredPhysicalGapIds = (recommendation?.targetedPhysicalGapIds ?? [])
        .filter((value): value is string => typeof value === "string");
      if (requiredPhysicalGapIds.length > 0) {
        return {
          required: recommendation?.eligibility !== "ineligible",
          requiredPhysicalGapIds,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    required: false,
    requiredPhysicalGapIds: [],
  };
}

async function selectTopologyReplayCandidate(input: {
  caseItem: ObservationV3ReplayMatrixCase;
  topologyRepeatDirectories: string[];
  supplementalRequirement: {
    required: boolean;
    requiredPhysicalGapIds: string[];
  };
}): Promise<{
  repeatDirectory: string;
  runId: string;
  sourceFingerprint: string | null;
  supplementalEvidence: LoadedSupplementalReplayEvidence[];
  supplementalCorrupt: boolean;
  satisfiesSupplementalRequirement: boolean;
  selectionReason: string;
} | null> {
  const candidates: Array<{
    repeatDirectory: string;
    runId: string;
    sourceFingerprint: string | null;
    supplementalEvidence: LoadedSupplementalReplayEvidence[];
    supplementalCorrupt: boolean;
    satisfiesSupplementalRequirement: boolean;
    selectionReason: string;
    rank: number;
  }> = [];

  for (const repeatDirectory of input.topologyRepeatDirectories) {
    const runDirectory = path.resolve(repeatDirectory, "..", "..", "..", "..");
    const runId = path.basename(runDirectory);
    const sourceFingerprint = await readTopologySourceFingerprint(repeatDirectory);

    let supplementalEvidence: LoadedSupplementalReplayEvidence[] = [];
    let supplementalCorrupt = false;
    try {
      supplementalEvidence = await loadPreservedSupplementalReplayEvidence({
        repeatDirectory,
      });
    } catch {
      supplementalCorrupt = true;
    }

    const sourceCompatible = sourceFingerprint === null || sourceFingerprint === input.caseItem.sourceHash;
    const availablePhysicalGapIds = new Set(supplementalEvidence.map((entry) => entry.physicalGapId));
    const satisfiesSupplementalRequirement = !input.supplementalRequirement.required
      || input.supplementalRequirement.requiredPhysicalGapIds.every((gapId) => availablePhysicalGapIds.has(gapId));

    candidates.push({
      repeatDirectory,
      runId,
      sourceFingerprint,
      supplementalEvidence,
      supplementalCorrupt,
      satisfiesSupplementalRequirement,
      selectionReason: sourceCompatible && satisfiesSupplementalRequirement
        ? "newest_source_compatible_topology_root_with_required_gaps"
        : sourceCompatible
          ? "newest_source_compatible_topology_root_missing_required_gaps"
          : "newest_topology_root_source_mismatch",
      rank: (
        (sourceCompatible ? 0 : 100)
        + (supplementalCorrupt ? 50 : 0)
        + (satisfiesSupplementalRequirement ? 0 : 10)
      ),
    });
  }

  const selected = candidates.sort((left, right) =>
    left.rank - right.rank
    || right.runId.localeCompare(left.runId)
  )[0];

  return selected ?? null;
}

async function readTopologySourceFingerprint(repeatDirectory: string): Promise<string | null> {
  try {
    const fingerprint = await readJson<{
      sourceFingerprint?: string | null;
    }>(path.join(repeatDirectory, "fingerprints.json"));
    return typeof fingerprint.sourceFingerprint === "string" ? fingerprint.sourceFingerprint : null;
  } catch {
    return null;
  }
}

async function loadTopologyExtractionReplayEvidence(input: {
  repeatDirectory: string;
}) {
  const attemptsDirectory = path.join(input.repeatDirectory, "attempts");
  try {
    const entries = await fs.readdir(attemptsDirectory, { withFileTypes: true });
    const candidateDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(attemptsDirectory, entry.name))
      .sort((left, right) => right.localeCompare(left));

    for (const attemptDirectory of candidateDirectories) {
      const evidence = await loadPreservedExtractionReplayEvidence({
        attemptDirectory,
      });
      if (evidence?.providerResult.outputText) {
        return evidence;
      }
    }
  } catch {
    return null;
  }

  return null;
}
