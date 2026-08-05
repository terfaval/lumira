import type {
  ExperimentalEvidenceSpan,
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type {
  PlannedSupplementalRealization,
  PlannedSupplementalGap,
  StructuredSupplementalOutput,
  SupplementalRealizationPackage,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function buildRecoveryProvenance(statement: string, target: PlannedSupplementalGap, extractionLocalRegionId: string) {
  const normalized = normalizeText(statement);
  return {
    canonicalRecoveryWindowId: target.targetId,
    physicalGapId: target.physicalGapId,
    extractionLocalRegionId,
    semanticSignature: normalized,
    entitySignature: [...new Set(tokenize(statement).filter((token) => token.length >= 4))].sort((left, right) => left.localeCompare(right)),
    eventStateType: /\b(meghal|kel|megy|jon|fut|keres|lat|fel[ae]bred|mond|kiab[ae]l|siet|elvesz|talalkoz)\b/.test(normalized)
      ? "event" as const
      : /\b(vagyok|van|volt|tun|erzem|szennyezett|szomoru|egett|eloltottak)\b/.test(normalized)
        ? "state" as const
        : "unknown" as const,
  };
}

function toExperimentalEvidence(evidence: Array<Record<string, unknown>>): ExperimentalEvidenceSpan[] {
  return evidence.map((entry) => ({
    snippet: typeof entry.snippet === "string" ? entry.snippet : "",
    spanStart: typeof entry.spanStart === "number" ? entry.spanStart : null,
    spanEnd: typeof entry.spanEnd === "number" ? entry.spanEnd : null,
    contextLabel: typeof entry.contextLabel === "string" ? entry.contextLabel : null,
  }));
}

function clampSpanStart(value: number): number {
  return Math.max(0, value);
}

function clampSpanEnd(value: number, sourceLength: number): number {
  return Math.max(0, Math.min(sourceLength, value));
}

function shiftEvidenceToAbsolute(
  evidence: ExperimentalEvidenceSpan[],
  contextStart: number,
  sourceLength: number,
  spanMode: "absolute" | "relative",
): ExperimentalEvidenceSpan[] {
  return evidence.map((entry) => ({
    ...entry,
    spanStart: typeof entry.spanStart === "number"
      ? spanMode === "absolute"
        ? clampSpanStart(Math.min(entry.spanStart, sourceLength))
        : clampSpanStart(contextStart + entry.spanStart)
      : null,
    spanEnd: typeof entry.spanEnd === "number"
      ? spanMode === "absolute"
        ? clampSpanEnd(entry.spanEnd, sourceLength)
        : clampSpanEnd(contextStart + entry.spanEnd, sourceLength)
      : null,
  }));
}

function inferStructuredSpanMode(input: {
  regionSpanStart: number;
  regionSpanEnd: number;
  target: PlannedSupplementalGap;
}): "absolute" | "relative" {
  const contextLength = Math.max(0, input.target.contextEnd - input.target.contextStart);
  if (
    input.regionSpanStart >= input.target.contextStart
    || input.regionSpanEnd > contextLength
  ) {
    return "absolute";
  }

  return "relative";
}

export function buildSupplementalRealizationPackage(input: {
  sourceText: string;
  plan: PlannedSupplementalRealization;
  target: PlannedSupplementalGap;
  structured: StructuredSupplementalOutput;
  packageIndex: number;
}): SupplementalRealizationPackage {
  const regions: ExperimentalRegion[] = (input.structured.regions ?? []).map((region, regionIndex) => {
    const spanMode = inferStructuredSpanMode({
      regionSpanStart: region.spanStart,
      regionSpanEnd: region.spanEnd,
      target: input.target,
    });
    const absoluteRegionSpanStart = spanMode === "absolute"
      ? clampSpanStart(Math.min(region.spanStart, input.sourceText.length))
      : clampSpanStart(Math.min(input.target.contextStart + region.spanStart, input.sourceText.length));
    const absoluteRegionSpanEnd = spanMode === "absolute"
      ? clampSpanEnd(region.spanEnd, input.sourceText.length)
      : clampSpanEnd(input.target.contextStart + region.spanEnd, input.sourceText.length);

    return {
      regionId: `recovery-${input.packageIndex + 1}-${region.regionId || `region-${regionIndex + 1}`}`,
      order: regionIndex,
      heading: region.heading,
      spanStart: absoluteRegionSpanStart,
      spanEnd: absoluteRegionSpanEnd,
      evidence: [{
        snippet: input.sourceText.slice(absoluteRegionSpanStart, absoluteRegionSpanEnd),
        spanStart: absoluteRegionSpanStart,
        spanEnd: absoluteRegionSpanEnd,
        contextLabel: "recovery_region",
      }],
      boundaryConfidence: region.boundaryUncertainty ? "low" as const : "medium" as const,
      uncertainty: region.boundaryUncertainty,
      transitionCues: region.transitionCues,
    };
  });

  const observations: ExperimentalObservationUnit[] = (input.structured.regions ?? []).flatMap((region, regionIndex) =>
    region.observations.map((observation, observationIndex) => ({
      observationId: `recovery-${input.packageIndex + 1}-${observation.observationId || `${regionIndex + 1}-${observationIndex + 1}`}`,
      regionId: `recovery-${input.packageIndex + 1}-${region.regionId || `region-${regionIndex + 1}`}`,
      order: observationIndex,
      statement: observation.statement,
      evidence: shiftEvidenceToAbsolute(
        toExperimentalEvidence(observation.evidence),
        input.target.contextStart,
        input.sourceText.length,
        inferStructuredSpanMode({
          regionSpanStart: region.spanStart,
          regionSpanEnd: region.spanEnd,
          target: input.target,
        }),
      ),
      uncertainty: observation.uncertainty,
      source: "recovery" as const,
      recoveryProvenance: buildRecoveryProvenance(
        observation.statement,
        input.target,
        region.regionId || `region-${regionIndex + 1}`,
      ),
    })),
  );

  return {
    packageId: `supplemental-package-${input.packageIndex + 1}-${input.target.physicalGapId}`,
    requestId: input.plan.request.requestId,
    physicalGapId: input.target.physicalGapId,
    regions,
    observations,
    provenance: {
      provenanceId: `supplemental-provenance-${input.packageIndex + 1}-${input.target.physicalGapId}`,
      requestId: input.plan.request.requestId,
      physicalGapId: input.target.physicalGapId,
      completenessReportId: input.plan.request.completenessReportId,
      policyVersion: input.plan.request.policyVersion,
      policyFingerprint: input.plan.request.policyFingerprint,
    },
  };
}
