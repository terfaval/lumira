import type {
  SupplementalRealizationEquivalence,
  SupplementalRealizationShadowRun,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";
import { stableSupplementalRealizationStringify } from "@/src/cognition/observation-v3/supplemental-realization/fingerprints";

export function buildSupplementalRealizationArtifacts(run: SupplementalRealizationShadowRun): Record<string, unknown> {
  return {
    "realization-plan": run.plan.request,
    "selected-gaps": run.plan.selectedGaps,
    "realization-context": run.plan.realizationContext,
    "supplemental-package": run.result.packages.map((pkg) => ({
      packageId: pkg.packageId,
      physicalGapId: pkg.physicalGapId,
      regionCount: pkg.regions.length,
      observationCount: pkg.observations.length,
    })),
    "supplemental-provenance": run.result.packages.map((pkg) => pkg.provenance),
    "realization-diagnostics": run.result.diagnostics,
    "realization-summary": {
      disposition: run.result.disposition,
      packageCount: run.result.packages.length,
      targetCount: run.plan.selectedGaps.length,
      realizedObservationCount: run.result.diagnostics.realizedObservationCount,
    },
  };
}

export function compareSupplementalRealizationOutputs(input: {
  plannedTargets: Array<{ physicalGapId: string; contextStart: number; contextEnd: number }>;
  experimental: {
    regions: Array<{ regionId: string; order: number }>;
    observations: Array<{ observationId: string; regionId: string; order: number; statement: string }>;
  };
  supplemental: {
    regions: Array<{ regionId: string; order: number }>;
    observations: Array<{ observationId: string; regionId: string; order: number; statement: string }>;
  };
}): SupplementalRealizationEquivalence {
  const comparableExperimental = {
    plannedTargets: input.plannedTargets,
    regions: input.experimental.regions,
    observations: input.experimental.observations,
  };
  const comparableSupplemental = {
    plannedTargets: input.plannedTargets,
    regions: input.supplemental.regions,
    observations: input.supplemental.observations,
  };

  if (stableSupplementalRealizationStringify(comparableExperimental) === stableSupplementalRealizationStringify(comparableSupplemental)) {
    return {
      classification: "equivalent",
      reasons: ["identical_bounded_supplemental_realization"],
    };
  }

  return {
    classification: "equivalent_with_representation_difference",
    reasons: ["bounded_supplemental_representation_difference_detected"],
  };
}
