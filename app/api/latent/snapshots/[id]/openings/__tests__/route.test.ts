import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSnapshotById = vi.fn();
const listOpeningsByLatentSnapshot = vi.fn();
const listRecentOpeningsByUser = vi.fn();
const createOpening = vi.fn();

const forbiddenMutationFns = {
  archiveSnapshot: vi.fn(),
  activateOpening: vi.fn(),
  setSuppression: vi.fn(),
  dismissOpening: vi.fn(),
};

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-latent-repository", () => ({
  createLatentRepository: () => ({
    getSnapshotById,
    archiveSnapshot: forbiddenMutationFns.archiveSnapshot,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    listOpeningsByLatentSnapshot,
    listRecentOpeningsByUser,
    createOpening,
    activateOpening: forbiddenMutationFns.activateOpening,
    setSuppression: forbiddenMutationFns.setSuppression,
    dismissOpening: forbiddenMutationFns.dismissOpening,
  }),
}));

describe("/api/latent/snapshots/[id]/openings route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getSnapshotById.mockReset();
    listOpeningsByLatentSnapshot.mockReset();
    listRecentOpeningsByUser.mockReset();
    createOpening.mockReset();
    Object.values(forbiddenMutationFns).forEach((fn) => fn.mockReset());
  });

  it("requires explicit user invocation boundary", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    const { POST } = await import("@/app/api/latent/snapshots/[id]/openings/route");
    const response = await POST(
      new Request("http://localhost/api/latent/snapshots/latent-1/openings", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "latent-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("creates opening candidates with provenance from latent snapshot without canonical mutations", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue({
      id: "latent-1",
      userId: "user-a",
      summary: "summary",
      confidenceBand: "tentative",
      visibility: "internal_only",
      provenance: {
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        generationContext: "ctx",
      },
      signals: [],
      suggestions: [
        {
          id: "s-1",
          snapshotId: "latent-1",
          userId: "user-a",
          suggestionType: "possible_recurrence",
          phrasing: "This may connect with nearby recurring reflective material.",
          confidenceBand: "tentative",
          visibility: "reflective_space_optional",
          provenance: {
            sourceReflectiveObjects: ["obj-1"],
            sourceObservations: ["obs-1"],
            sourceGlossaryTerms: [],
            sourceThreads: [],
            sourceResponses: [],
            generationContext: "ctx",
          },
          createdAt: "2026-05-24T00:00:00.000Z",
          updatedAt: "2026-05-24T00:00:00.000Z",
        },
      ],
      archivedAt: null,
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    });
    listOpeningsByLatentSnapshot.mockResolvedValue([]);
    listRecentOpeningsByUser.mockResolvedValue([]);
    createOpening.mockResolvedValue({ id: "opening-1" });

    const { POST } = await import("@/app/api/latent/snapshots/[id]/openings/route");
    const response = await POST(
      new Request("http://localhost/api/latent/snapshots/latent-1/openings", {
        method: "POST",
        body: JSON.stringify({ userInvocationBoundary: "expand_opening_surface" }),
      }),
      { params: Promise.resolve({ id: "latent-1" }) },
    );

    expect(response.status).toBe(201);
    expect(createOpening).toHaveBeenCalledTimes(1);
    expect(createOpening).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: "invitation_surface",
        provenance: expect.objectContaining({
          latentSnapshotReference: "latent-1",
          sourceObjects: ["obj-1"],
        }),
      }),
    );

    expect(forbiddenMutationFns.archiveSnapshot).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.activateOpening).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.setSuppression).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.dismissOpening).not.toHaveBeenCalled();
  });

  it("returns no-opening reason when cadence policy preserves silence", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue({
      id: "latent-1",
      userId: "user-a",
      summary: "summary",
      confidenceBand: "tentative",
      visibility: "internal_only",
      provenance: {
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        generationContext: "ctx",
      },
      signals: [],
      suggestions: [
        {
          id: "s-1",
          snapshotId: "latent-1",
          userId: "user-a",
          suggestionType: "possible_recurrence",
          phrasing: "This may connect with nearby recurring reflective material.",
          confidenceBand: "tentative",
          visibility: "reflective_space_optional",
          provenance: {
            sourceReflectiveObjects: ["obj-1"],
            sourceObservations: ["obs-1"],
            sourceGlossaryTerms: [],
            sourceThreads: [],
            sourceResponses: [],
            generationContext: "ctx",
          },
          createdAt: "2026-05-24T00:00:00.000Z",
          updatedAt: "2026-05-24T00:00:00.000Z",
        },
      ],
      archivedAt: null,
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    });
    listOpeningsByLatentSnapshot.mockResolvedValue([]);
    listRecentOpeningsByUser.mockResolvedValue([
      {
        id: "opening-older",
        userId: "user-a",
        openingType: "continuity_noticing",
        tone: "gentle",
        utterance: "This may connect with nearby recurring reflective material.",
        state: "available",
        visibility: "invitation_surface",
        suppressionState: "none",
        suppressionDuration: null,
        suppressionReason: null,
        suppressionExpiry: { at: null },
        suppressionRevisitEligibility: "revisitable_dormant",
        suppressionReactivatedAt: null,
        provenance: {
          sourceObjects: ["obj-1"],
          sourceObservations: ["obs-1"],
          sourceGlossaryTerms: [],
          sourceThreads: [],
          sourceResponses: [],
          latentSnapshotReference: "latent-x",
          confidenceBand: "tentative",
          openingGenerationContext: "ctx",
        },
        activatedAt: null,
        dismissedAt: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const { POST } = await import("@/app/api/latent/snapshots/[id]/openings/route");
    const response = await POST(
      new Request("http://localhost/api/latent/snapshots/latent-1/openings", {
        method: "POST",
        body: JSON.stringify({ userInvocationBoundary: "expand_opening_surface" }),
      }),
      { params: Promise.resolve({ id: "latent-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openings).toEqual([]);
    expect(body.noOpeningReason).toBe("recent_resurfacing");
    expect(createOpening).not.toHaveBeenCalled();
  });
});
