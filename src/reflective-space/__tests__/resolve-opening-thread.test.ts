import { describe, expect, it, vi } from "vitest";

import type { ContinuityNeighborhood } from "@/src/domain/anchor-v1/continuity-neighborhood";
import { DEFAULT_CONTINUITY_NEIGHBORHOOD_BOUNDS } from "@/src/domain/anchor-v1/continuity-neighborhood";
import {
  ContinuityNeighborhoodContractError,
  ContinuityNeighborhoodOperationalError,
} from "@/src/domain/anchor-v1/continuity-neighborhood-reader";
import { resolveReusableThreadId } from "@/src/reflective-space/resolve-opening-thread";

function createNeighborhood(input?: Partial<ContinuityNeighborhood>): ContinuityNeighborhood {
  return {
    center: {
      requestedLookup: {
        kind: "opportunity_manifestation_id",
        opportunityManifestationId: "opp-man-1",
      },
      resolvedCenterKind: "anchor_participation",
      resolvedCenterId: "participation-1",
      matchedBy: "opportunity_manifestation_id",
    },
    identities: [
      {
        itemKind: "anchor_identity",
        anchorId: "anchor-1",
        anchorType: "ENTITY",
        identityLabel: "Phone",
        createdAt: "2026-06-17T09:00:00.000Z",
        updatedAt: "2026-06-17T09:00:00.000Z",
        directness: "direct",
      },
    ],
    manifestations: [
      {
        itemKind: "anchor_manifestation",
        anchorManifestationId: "manifestation-1",
        anchorId: "anchor-1",
        reflectiveObjectId: "obj-neighborhood",
        manifestationLabel: "Phone searching",
        sourceType: "DREAM_DERIVED",
        createdAt: "2026-06-17T09:30:00.000Z",
        updatedAt: "2026-06-17T09:30:00.000Z",
        directness: "direct",
      },
    ],
    participations: [
      {
        itemKind: "anchor_participation",
        anchorParticipationId: "participation-1",
        anchorId: "anchor-1",
        anchorManifestationId: "manifestation-1",
        opportunityId: "opp-1",
        opportunityManifestationId: "opp-man-1",
        participationRole: "EVIDENCE",
        confidence: "HIGH",
        source: "LLM_CONSTRUCTED",
        createdAt: "2026-06-17T09:40:00.000Z",
        updatedAt: "2026-06-17T09:40:00.000Z",
        directness: "center",
      },
    ],
    opportunityRefs: [
      {
        itemKind: "opportunity_manifestation_ref",
        anchorParticipationId: "participation-1",
        opportunityId: "opp-1",
        opportunityManifestationId: "opp-man-1",
        directness: "referenced",
      },
    ],
    boundsApplied: DEFAULT_CONTINUITY_NEIGHBORHOOD_BOUNDS,
    ambiguity: null,
    partial: false,
    warnings: [],
    ...input,
  };
}

describe("resolveReusableThreadId", () => {
  it("keeps explicit source thread lineage ahead of continuity support", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-1" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([{ threadId: "thread-response" }]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(createNeighborhood()),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-1"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBe("thread-source");
    expect(responseRepository.listOpeningResponseAssociationsByOpening).not.toHaveBeenCalled();
  });

  it("keeps existing thread-owned response associations ahead of continuity support", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-response" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-1" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([{ threadId: "thread-response" }]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(createNeighborhood()),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
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
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBe("thread-response");
  });

  it("allows anchor continuity to support an already plausible thread candidate", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-neighborhood" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(createNeighborhood()),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-direct-miss"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBe("thread-source");
    expect(continuityNeighborhoodReader.readNeighborhood).toHaveBeenCalledWith(
      "user-a",
      {
        kind: "opportunity_manifestation_id",
        opportunityManifestationId: "opp-man-1",
      },
      DEFAULT_CONTINUITY_NEIGHBORHOOD_BOUNDS,
    );
  });

  it("does not let anchor continuity alone force thread reuse", async () => {
    const threadRepository = {
      getThreadById: vi.fn(),
      listAssociationsByThread: vi.fn(),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(createNeighborhood()),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-direct-miss"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: [],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBeNull();
    expect(threadRepository.getThreadById).not.toHaveBeenCalled();
  });

  it("preserves previous behavior when no anchor continuity lookup can be resolved", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-neighborhood" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn(),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-direct-miss"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: null,
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBeNull();
    expect(continuityNeighborhoodReader.readNeighborhood).not.toHaveBeenCalled();
  });

  it("falls back to previous thread behavior when continuity reading fails operationally", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-1" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockRejectedValue(new ContinuityNeighborhoodOperationalError("continuity unavailable")),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-1"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBe("thread-source");
  });

  it("preserves previous behavior when the neighborhood is empty", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-neighborhood" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(
        createNeighborhood({
          center: {
            requestedLookup: { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-1" },
            resolvedCenterKind: null,
            resolvedCenterId: null,
            matchedBy: null,
          },
          ambiguity: null,
          identities: [],
          manifestations: [],
          participations: [],
          opportunityRefs: [],
        }),
      ),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-direct-miss"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBeNull();
  });

  it("does not treat a partial neighborhood as complete continuity evidence", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-neighborhood" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(createNeighborhood({ partial: true })),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-direct-miss"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBeNull();
  });

  it("treats ambiguous continuity as unusable and falls back to thread-owned evidence only", async () => {
    const threadRepository = {
      getThreadById: vi.fn().mockResolvedValue({ id: "thread-source" }),
      listAssociationsByThread: vi.fn().mockResolvedValue([{ reflectiveObjectId: "obj-neighborhood" }]),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockResolvedValue(
        createNeighborhood({
          center: {
            requestedLookup: { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-1" },
            resolvedCenterKind: null,
            resolvedCenterId: null,
            matchedBy: null,
          },
          ambiguity: {
            kind: "multiple_anchor_identity_matches",
            matchedBy: "opportunity_manifestation_id",
            representativeAnchorIds: ["anchor-1", "anchor-2"],
          },
          identities: [],
          manifestations: [],
          participations: [],
          opportunityRefs: [],
        }),
      ),
    };

    const threadId = await resolveReusableThreadId({
      opening: {
        id: "opening-1",
        provenance: {
          sourceObjects: ["obj-direct-miss"],
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: ["thread-source"],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "test",
          sourceOpportunityManifestationId: "opp-man-1",
        },
      },
      userId: "user-a",
      responseRepository: responseRepository as never,
      threadRepository: threadRepository as never,
      continuityNeighborhoodReader: continuityNeighborhoodReader as never,
    });

    expect(threadId).toBeNull();
  });

  it("propagates malformed continuity payload failures past Thread", async () => {
    const threadRepository = {
      getThreadById: vi.fn(),
      listAssociationsByThread: vi.fn(),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi.fn().mockRejectedValue(new ContinuityNeighborhoodContractError("malformed rpc payload")),
    };

    await expect(
      resolveReusableThreadId({
        opening: {
          id: "opening-1",
          provenance: {
            sourceObjects: ["obj-1"],
            sourceObservations: [],
            sourceGlossaryTerms: [],
            sourceThreads: ["thread-source"],
            sourceResponses: [],
            latentSnapshotReference: null,
            confidenceBand: "moderate",
            openingGenerationContext: "test",
            sourceOpportunityManifestationId: "opp-man-1",
          },
        },
        userId: "user-a",
        responseRepository: responseRepository as never,
        threadRepository: threadRepository as never,
        continuityNeighborhoodReader: continuityNeighborhoodReader as never,
      }),
    ).rejects.toThrow("malformed rpc payload");
  });

  it("propagates representative participation invariant failures past Thread", async () => {
    const threadRepository = {
      getThreadById: vi.fn(),
      listAssociationsByThread: vi.fn(),
    };
    const responseRepository = {
      listOpeningResponseAssociationsByOpening: vi.fn().mockResolvedValue([]),
    };
    const continuityNeighborhoodReader = {
      readNeighborhood: vi
        .fn()
        .mockRejectedValue(
          new ContinuityNeighborhoodContractError(
            "Exact opportunity classification returned unique without a representative participation.",
          ),
        ),
    };

    await expect(
      resolveReusableThreadId({
        opening: {
          id: "opening-1",
          provenance: {
            sourceObjects: ["obj-1"],
            sourceObservations: [],
            sourceGlossaryTerms: [],
            sourceThreads: ["thread-source"],
            sourceResponses: [],
            latentSnapshotReference: null,
            confidenceBand: "moderate",
            openingGenerationContext: "test",
            sourceOpportunityManifestationId: "opp-man-1",
          },
        },
        userId: "user-a",
        responseRepository: responseRepository as never,
        threadRepository: threadRepository as never,
        continuityNeighborhoodReader: continuityNeighborhoodReader as never,
      }),
    ).rejects.toThrow("unique without a representative participation");
  });
});
