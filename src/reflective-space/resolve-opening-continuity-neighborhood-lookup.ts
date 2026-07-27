import type { ContinuityNeighborhoodLookup } from "@/src/domain/anchor-v1/continuity-neighborhood";
import type { Opening } from "@/src/domain/openings/types";

export function resolveOpeningContinuityNeighborhoodLookup(
  opening: Pick<Opening, "provenance">,
): ContinuityNeighborhoodLookup | null {
  const opportunityManifestationId = opening.provenance.sourceOpportunityManifestationId;
  if (!opportunityManifestationId) {
    return null;
  }

  return {
    kind: "opportunity_manifestation_id",
    opportunityManifestationId,
  };
}
