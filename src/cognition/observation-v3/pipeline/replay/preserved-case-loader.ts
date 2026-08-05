import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { StructuredDescriptiveExtractionProviderResult } from "@/src/cognition/observation-v3/descriptive-extraction";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import type { SupplementalRealizationExecutionResponse } from "@/src/cognition/observation-v3/supplemental-realization";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export interface LoadedExtractionReplayEvidence {
  attemptNumber: number;
  sourceArtifactRef: string;
  providerResult: StructuredDescriptiveExtractionProviderResult;
  rawProviderResponsePreserved: boolean;
  providerResponseHash: string;
}

export interface LoadedSupplementalReplayEvidence {
  physicalGapId: string;
  sourceArtifactRef: string;
  providerResult: SupplementalRealizationExecutionResponse;
  providerResponseHash: string;
}

export async function loadPreservedExtractionReplayEvidence(input: {
  attemptDirectory: string;
}): Promise<LoadedExtractionReplayEvidence | null> {
  const metadataPath = path.join(input.attemptDirectory, "attempt-metadata.json");
  const canonicalEvidencePath = path.join(input.attemptDirectory, "descriptive-provider-evidence.json");
  const providerArtifactPath = path.join(input.attemptDirectory, "provider-structured-output.json");
  const metadata = await readAttemptMetadata(metadataPath);

  if (await fileExists(canonicalEvidencePath)) {
    const evidence = await readJson<DescriptiveExtractionProviderEvidence>(canonicalEvidencePath);
    const outputText = typeof (evidence.providerBoundary.sanitizedPayload as { outputText?: unknown } | null)?.outputText === "string"
      ? (evidence.providerBoundary.sanitizedPayload as { outputText: string }).outputText
      : evidence.parsing.structuredOutput !== null
        ? JSON.stringify(evidence.parsing.structuredOutput)
        : null;

    return {
      attemptNumber: evidence.attemptIdentity.attemptNumber ?? metadata?.attemptNumber ?? 1,
      sourceArtifactRef: canonicalEvidencePath,
      providerResult: {
        outputText,
        providerDiagnostics: {
          elapsedMs: evidence.providerBoundary.latencyMs ?? 0,
          providerStatus: typeof evidence.providerBoundary.providerMetadata?.providerStatus === "string"
            ? evidence.providerBoundary.providerMetadata.providerStatus
            : null,
          providerIncompleteReason: evidence.providerBoundary.incompleteReason,
          providerReturnedStructuredOutput: outputText !== null,
          inputTokenUsage: evidence.providerBoundary.tokenUsage?.input ?? null,
          outputTokenUsage: evidence.providerBoundary.tokenUsage?.output ?? null,
          totalTokenUsage: evidence.providerBoundary.tokenUsage?.total ?? null,
        },
      },
      rawProviderResponsePreserved: true,
      providerResponseHash: evidence.providerBoundary.payloadHash ?? sha256Hex(JSON.stringify(evidence.parsing.structuredOutput ?? null)),
    };
  }

  if (!metadata) {
    return null;
  }

  if (!await fileExists(providerArtifactPath)) {
    return {
      attemptNumber: metadata.attemptNumber ?? 1,
      sourceArtifactRef: providerArtifactPath,
      providerResult: {
        outputText: null,
        providerDiagnostics: {
          elapsedMs: 0,
          providerStatus: null,
          providerIncompleteReason: null,
          providerReturnedStructuredOutput: false,
          inputTokenUsage: null,
          outputTokenUsage: null,
          totalTokenUsage: null,
        },
      },
      rawProviderResponsePreserved: Boolean(metadata.rawProviderResponsePreserved),
      providerResponseHash: sha256Hex("missing"),
    };
  }

  const raw = await fs.readFile(providerArtifactPath, "utf8");
  return {
    attemptNumber: metadata.attemptNumber ?? 1,
    sourceArtifactRef: providerArtifactPath,
    providerResult: JSON.parse(raw) as StructuredDescriptiveExtractionProviderResult,
    rawProviderResponsePreserved: Boolean(metadata.rawProviderResponsePreserved),
      providerResponseHash: sha256Hex(raw),
  };
}

async function readAttemptMetadata(filePath: string): Promise<{
  attemptNumber?: number;
  rawProviderResponsePreserved?: boolean;
} | null> {
  if (!await fileExists(filePath)) {
    return null;
  }

  return readJson<{
    attemptNumber?: number;
    rawProviderResponsePreserved?: boolean;
  }>(filePath);
}

export async function loadPreservedSupplementalReplayEvidence(input: {
  repeatDirectory: string;
}): Promise<LoadedSupplementalReplayEvidence[]> {
  const canonicalIndexPath = path.join(input.repeatDirectory, "supplemental-provider-evidence-index.json");
  const selectionPath = path.join(input.repeatDirectory, "stages", "02-recovery_selection.json");
  const providerArtifactPath = path.join(input.repeatDirectory, "stages", "03-recovery_extraction.provider-output.json");

  if (await fileExists(canonicalIndexPath)) {
    const targetToPhysicalGapId = await loadTargetToPhysicalGapIdMap({
      selectionPath,
    });
    const index = await readJson<Array<{
      targetId?: string;
      evidenceArtifactRef?: string;
    }>>(canonicalIndexPath);
    const results: LoadedSupplementalReplayEvidence[] = [];

    for (const entry of index) {
      if (!entry.targetId || !entry.evidenceArtifactRef) {
        continue;
      }

      const evidencePath = path.resolve(input.repeatDirectory, entry.evidenceArtifactRef);
      const evidence = await readJson<SupplementalRealizationProviderEvidence>(evidencePath);
      const providerMetadata = evidence.providerBoundary.providerMetadata as {
        physicalGapId?: string;
      } | null;
      const outputText = typeof (evidence.providerBoundary.sanitizedPayload as { outputText?: unknown } | null)?.outputText === "string"
        ? (evidence.providerBoundary.sanitizedPayload as { outputText: string }).outputText
        : evidence.parsing.structuredOutput !== null
          ? JSON.stringify(evidence.parsing.structuredOutput)
          : null;

      results.push({
        physicalGapId: providerMetadata?.physicalGapId
          ?? (entry.targetId ? targetToPhysicalGapId.get(entry.targetId) : undefined)
          ?? entry.targetId,
        sourceArtifactRef: evidencePath,
        providerResult: {
          outputText,
          providerStatus: typeof evidence.providerBoundary.providerMetadata?.providerStatus === "string"
            ? evidence.providerBoundary.providerMetadata.providerStatus
            : null,
          providerIncompleteReason: evidence.providerBoundary.incompleteReason,
          tokenUsage: {
            input: evidence.providerBoundary.tokenUsage?.input ?? null,
            output: evidence.providerBoundary.tokenUsage?.output ?? null,
            total: evidence.providerBoundary.tokenUsage?.total ?? null,
          },
        },
        providerResponseHash: evidence.providerBoundary.payloadHash ?? sha256Hex(JSON.stringify(evidence.parsing.structuredOutput ?? null)),
      });
    }

    return results;
  }

  if (!await fileExists(selectionPath)) {
    return [];
  }

  const selection = await readJson<{
    artifact?: {
      canonicalGaps?: Array<{ physicalGapId?: string }>;
    };
  }>(selectionPath);
  const gapIds = (selection.artifact?.canonicalGaps ?? [])
    .map((entry) => entry.physicalGapId)
    .filter((value): value is string => Boolean(value));

  if (!await fileExists(providerArtifactPath)) {
    return gapIds.map((physicalGapId) => ({
      physicalGapId,
      sourceArtifactRef: providerArtifactPath,
      providerResult: {
        outputText: null,
        providerStatus: null,
        providerIncompleteReason: null,
        tokenUsage: {
          input: null,
          output: null,
          total: null,
        },
      },
      providerResponseHash: sha256Hex("missing"),
    }));
  }

  const raw = await fs.readFile(providerArtifactPath, "utf8");
  const providerResult = JSON.parse(raw) as SupplementalRealizationExecutionResponse;
  return gapIds.map((physicalGapId) => ({
    physicalGapId,
    sourceArtifactRef: providerArtifactPath,
    providerResult,
    providerResponseHash: sha256Hex(raw),
  }));
}

async function loadTargetToPhysicalGapIdMap(input: {
  selectionPath: string;
}): Promise<Map<string, string>> {
  if (!await fileExists(input.selectionPath)) {
    return new Map();
  }

  const selection = await readJson<{
    artifact?: {
      canonicalRecoveryWindows?: Array<{
        targetId?: string;
        physicalGapId?: string;
      }>;
      rawRecoveryWindows?: Array<{
        targetId?: string;
        physicalGapId?: string;
      }>;
    };
  }>(input.selectionPath);

  const entries = [
    ...(selection.artifact?.canonicalRecoveryWindows ?? []),
    ...(selection.artifact?.rawRecoveryWindows ?? []),
  ];

  return new Map(
    entries
      .filter((entry): entry is { targetId: string; physicalGapId: string } =>
        typeof entry.targetId === "string" && typeof entry.physicalGapId === "string")
      .map((entry) => [entry.targetId, entry.physicalGapId] as const),
  );
}
