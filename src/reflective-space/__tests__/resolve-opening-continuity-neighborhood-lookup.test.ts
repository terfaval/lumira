import { describe, expect, it } from "vitest";

import { resolveOpeningContinuityNeighborhoodLookup } from "@/src/reflective-space/resolve-opening-continuity-neighborhood-lookup";

describe("resolveOpeningContinuityNeighborhoodLookup", () => {
  it("resolves an opening with source opportunity manifestation provenance", () => {
    const lookup = resolveOpeningContinuityNeighborhoodLookup({
      provenance: {
        sourceObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        latentSnapshotReference: null,
        confidenceBand: "moderate",
        openingGenerationContext: "test",
        sourceOpportunityManifestationId: "opp-man-1",
      },
    });

    expect(lookup).toEqual({
      kind: "opportunity_manifestation_id",
      opportunityManifestationId: "opp-man-1",
    });
  });

  it("returns null when the opening has no authorized opportunity manifestation provenance", () => {
    const lookup = resolveOpeningContinuityNeighborhoodLookup({
      provenance: {
        sourceObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        latentSnapshotReference: null,
        confidenceBand: "moderate",
        openingGenerationContext: "test",
        sourceOpportunityManifestationId: null,
      },
    });

    expect(lookup).toBeNull();
  });

  it("does not fall back to source threads when opportunity manifestation provenance is missing", () => {
    const lookup = resolveOpeningContinuityNeighborhoodLookup({
      provenance: {
        sourceObjects: [],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: ["thread-1"],
        sourceResponses: [],
        latentSnapshotReference: null,
        confidenceBand: "moderate",
        openingGenerationContext: "test",
        sourceOpportunityManifestationId: null,
      },
    });

    expect(lookup).toBeNull();
  });

  it("does not fall back to reflective object overlap when opportunity manifestation provenance is missing", () => {
    const lookup = resolveOpeningContinuityNeighborhoodLookup({
      provenance: {
        sourceObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        latentSnapshotReference: null,
        confidenceBand: "moderate",
        openingGenerationContext: "test",
        sourceOpportunityManifestationId: null,
      },
    });

    expect(lookup).toBeNull();
  });
});
