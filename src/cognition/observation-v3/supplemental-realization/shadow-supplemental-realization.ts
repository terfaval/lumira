import type {
  PlannedSupplementalGap,
  SupplementalRealizationExecutionResponse,
  SupplementalRealizationShadowInput,
  SupplementalRealizationShadowRun,
  SupplementalRealizationRunResult,
  StructuredSupplementalOutput,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";
import {
  SUPPLEMENTAL_REALIZATION_MODEL,
  SUPPLEMENTAL_REALIZATION_SCHEMA_NAME,
  SUPPLEMENTAL_REALIZATION_TIMEOUT_MS,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";
import { buildSupplementalRealizationPackage } from "@/src/cognition/observation-v3/supplemental-realization/package-builder";
import {
  buildSupplementalRealizationPrompt,
  executeOpenAiSupplementalRealization,
  SUPPLEMENTAL_REALIZATION_SCHEMA,
} from "@/src/cognition/observation-v3/supplemental-realization/provider-adapter";
import {
  findRelevantBaselineObservationText,
  planSupplementalRealization,
} from "@/src/cognition/observation-v3/supplemental-realization/realization-planner";
import {
  createSupplementalRealizationProviderEvidenceCapture,
  sha256StableProviderEvidence,
  type SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";

async function emitProviderEvidenceSafely(input: {
  onProviderEvidence?: (evidence: SupplementalRealizationProviderEvidence) => void | Promise<void>;
  evidence: SupplementalRealizationProviderEvidence;
}): Promise<void> {
  try {
    await input.onProviderEvidence?.(input.evidence);
  } catch (error) {
    console.warn("observation_v3_supplemental_provider_evidence_capture_failed", {
      sourceIdentity: input.evidence.sourceIdentity,
      attemptIdentity: input.evidence.attemptIdentity.identity,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

async function executeTarget(input: {
  sourceText: string;
  sourceIdentity?: string;
  sourceHash: string;
  requestId: string;
  baselineUnits: SupplementalRealizationShadowInput["baseline"]["units"];
  target: PlannedSupplementalGap;
  onProviderEvidence?: (evidence: SupplementalRealizationProviderEvidence) => void | Promise<void>;
  executor: (input: {
    prompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
    timeoutMs: number;
    model: string;
    target: PlannedSupplementalGap;
  }) => Promise<SupplementalRealizationExecutionResponse>;
}) {
  const existingObservationText = findRelevantBaselineObservationText({
    baselineUnits: input.baselineUnits,
    contextStart: input.target.contextStart,
    contextEnd: input.target.contextEnd,
  });
  const prompt = buildSupplementalRealizationPrompt({
    target: input.target,
    sourceText: input.sourceText,
    existingObservationText,
  });

  const response = await input.executor({
    prompt,
    schema: SUPPLEMENTAL_REALIZATION_SCHEMA,
    schemaName: SUPPLEMENTAL_REALIZATION_SCHEMA_NAME,
    timeoutMs: SUPPLEMENTAL_REALIZATION_TIMEOUT_MS,
    model: SUPPLEMENTAL_REALIZATION_MODEL,
    target: input.target,
  });

  const providerEvidenceCapture = createSupplementalRealizationProviderEvidenceCapture({
    sourceIdentity: input.sourceIdentity ?? input.target.physicalGapId,
    sourceHash: input.sourceHash,
    supplementalRequestId: input.requestId,
    targetId: input.target.targetId,
    providerAttemptNumber: 1,
    request: {
      requestFingerprint: sha256StableProviderEvidence({
        model: SUPPLEMENTAL_REALIZATION_MODEL,
        schemaName: SUPPLEMENTAL_REALIZATION_SCHEMA_NAME,
        prompt,
      }),
      promptFingerprint: sha256StableProviderEvidence(prompt),
      schemaFingerprint: sha256StableProviderEvidence(SUPPLEMENTAL_REALIZATION_SCHEMA),
      modelIdentifier: SUPPLEMENTAL_REALIZATION_MODEL,
    },
    sanitizationVersion: "supplemental-realization-provider-sanitization-v1",
    parserFingerprint: sha256StableProviderEvidence(JSON.parse.toString()),
    parserSchemaFingerprint: sha256StableProviderEvidence(SUPPLEMENTAL_REALIZATION_SCHEMA),
    artifactVersion: "1",
  });
  providerEvidenceCapture.captureProviderBoundary({
    status: response.outputText ? "completed" : "incomplete",
    incompleteReason: response.providerIncompleteReason,
    sanitizedPayload: {
      outputText: response.outputText,
      providerStatus: response.providerStatus,
      providerIncompleteReason: response.providerIncompleteReason,
      tokenUsage: response.tokenUsage,
    },
    tokenUsage: response.tokenUsage,
    latencyMs: response.latencyMs ?? null,
    providerMetadata: {
      providerStatus: response.providerStatus,
      modelIdentifier: SUPPLEMENTAL_REALIZATION_MODEL,
      targetId: input.target.targetId,
      physicalGapId: input.target.physicalGapId,
    },
    occurredAt: null,
  });

  const structured = response.outputText
    ? JSON.parse(response.outputText) as StructuredSupplementalOutput
    : { regions: [] };
  await emitProviderEvidenceSafely({
    onProviderEvidence: input.onProviderEvidence,
    evidence: providerEvidenceCapture.captureParsing({
      status: response.outputText ? "parsed" : "not_available",
      structuredOutput: response.outputText ? structured : null,
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: Boolean(response.outputText),
    }),
  });

  return {
    prompt,
    response,
    structured,
  };
}

export async function runShadowSupplementalRealization(
  input: SupplementalRealizationShadowInput,
): Promise<SupplementalRealizationShadowRun> {
  const plan = planSupplementalRealization({
    sourceText: input.sourceText,
    completeness: input.completeness,
    baseline: input.baseline,
    contextPadding: input.contextPadding,
    maximumWindowLength: input.maximumWindowLength,
  });

  if (plan.selectedGaps.length === 0) {
    return {
      plan,
      result: {
        disposition: "abstained_not_justified",
        packages: [],
        diagnostics: {
          requestCount: 1,
          targetCount: 0,
          packageCount: 0,
          realizedRegionCount: 0,
          realizedObservationCount: 0,
          abstainedTargetCount: 0,
        },
        execution: [],
      },
    };
  }

  const executor = input.executeStructuredRealization ?? executeOpenAiSupplementalRealization;
  const packages = [];
  const execution: SupplementalRealizationRunResult["execution"] = [];

  for (const [index, target] of plan.realizationContext.entries()) {
    const realized = await executeTarget({
      sourceText: input.sourceText,
      sourceIdentity: input.sourceIdentity,
      sourceHash: input.completeness.sourceIdentity.sourceHash,
      requestId: plan.request.requestId,
      baselineUnits: input.baseline.units,
      target,
      onProviderEvidence: input.onProviderEvidence,
      executor,
    });
    const pkg = buildSupplementalRealizationPackage({
      sourceText: input.sourceText,
      plan,
      target,
      structured: realized.structured,
      packageIndex: index,
    });
    packages.push(pkg);
    execution.push({
      targetId: target.targetId,
      packageId: pkg.packageId,
      providerStatus: realized.response.providerStatus,
      providerIncompleteReason: realized.response.providerIncompleteReason,
      latencyMs: realized.response.latencyMs ?? null,
      tokenUsage: realized.response.tokenUsage,
      structured: realized.structured,
    });
  }

  return {
    plan,
    result: {
      disposition: packages.length > 0 ? "completed" : "completed_with_observations",
      packages,
      diagnostics: {
        requestCount: 1,
        targetCount: plan.selectedGaps.length,
        packageCount: packages.length,
        realizedRegionCount: packages.reduce((count, pkg) => count + pkg.regions.length, 0),
        realizedObservationCount: packages.reduce((count, pkg) => count + pkg.observations.length, 0),
        abstainedTargetCount: Math.max(0, plan.selectedGaps.length - packages.length),
      },
      execution,
    },
  };
}
