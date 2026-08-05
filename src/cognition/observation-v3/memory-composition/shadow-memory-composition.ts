import { buildMemoryCompositionArtifacts } from "@/src/cognition/observation-v3/memory-composition/composition-diagnostics";
import { composeMemoryPackages } from "@/src/cognition/observation-v3/memory-composition/memory-composition";
import type { MemoryCompositionRequest } from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";

export function runShadowMemoryComposition(request: MemoryCompositionRequest) {
  const result = composeMemoryPackages(request);
  const artifacts = buildMemoryCompositionArtifacts({
    result,
    baselinePackage: {
      regionCount: request.baseline.regions.length,
      unitCount: request.baseline.units.length,
    },
    supplementalPackage: {
      regionCount: request.supplemental.regions.length,
      unitCount: request.supplemental.units.length,
    },
  });

  return {
    result,
    artifacts,
  };
}
