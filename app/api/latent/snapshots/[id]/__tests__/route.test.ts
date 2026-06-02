import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSnapshotById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-latent-repository", () => ({
  createLatentRepository: () => ({
    getSnapshotById,
  }),
}));

describe("/api/latent/snapshots/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getSnapshotById.mockReset();
  });

  it("scopes latent snapshot lookup by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue({
      id: "latent-1",
      userId: "user-a",
      summary: "Center candidate selected: agency_state (agency_oriented) with lifecycle state stabilized.",
      confidenceBand: "moderate",
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
      suggestions: [],
      lifecycle: {
        centerCategory: "agency_state",
        centerState: "stabilized",
        centerScore: 1.8,
        persistenceStreak: 4,
        cooldownUntil: null,
        noCenterReason: null,
        salience: {
          userOwnedScore: 1.2,
          highlightScore: 0.4,
          glossaryDensityScore: 0.3,
          revisitationScore: 0.3,
          explicitEmphasisScore: 0.2,
          persistenceSignalScore: 0.2,
        },
        attenuation: {
          repetitionDecay: 0.9,
          refractoryPenalty: 1,
          cooldownPenalty: 1,
        },
        neighborhood: {
          relatedCategories: ["agency_state"],
          glossaryAnchors: [],
          affectAdjacency: [],
          continuityCues: [],
        },
        processingMode: {
          selectedMode: "agency_oriented",
          candidateModes: [
            {
              mode: "agency_oriented",
              score: 1.2,
              confidenceBand: "tentative",
              rationale: ["internal"],
            },
          ],
          modeConfidence: 0.7,
          uncertainty: 0.2,
          rationaleTrace: ["internal"],
          noModeReason: null,
          materialPriorities: {
            observations: 1,
            glossary: 0.2,
            notes: 0.1,
            responses: 0.2,
            neighborhood: 0.5,
          },
        },
      },
      archivedAt: null,
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-05-31T10:00:00.000Z",
    });

    const { GET } = await import("@/app/api/latent/snapshots/[id]/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots/latent-1"), {
      params: Promise.resolve({ id: "latent-1" }),
    });

    expect(response.status).toBe(200);
    expect(getSnapshotById).toHaveBeenCalledWith("latent-1", "user-a");
    const body = await response.json();
    expect(body.snapshot.summary.toLowerCase()).not.toContain("agency_oriented");
    expect(body.snapshot.lifecycle).toEqual({ centerState: "stabilized", noCenterReason: null });
    expect(body.snapshot.lifecycle).not.toHaveProperty("centerScore");
    expect(body.snapshot.lifecycle).not.toHaveProperty("processingMode");
  });

  it("returns 404 when snapshot is not owned by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue(null);

    const { GET } = await import("@/app/api/latent/snapshots/[id]/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots/latent-1"), {
      params: Promise.resolve({ id: "latent-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("keeps no-mode route payload mode-silent in public projection", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue({
      id: "latent-2",
      userId: "user-a",
      summary: "Center candidate selected: affect_transition (no_mode) with lifecycle state possible.",
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
      suggestions: [],
      lifecycle: {
        centerCategory: "affect_transition",
        centerState: "possible",
        centerScore: 1.2,
        persistenceStreak: 1,
        cooldownUntil: null,
        noCenterReason: null,
        salience: {
          userOwnedScore: 1.1,
          highlightScore: 0.1,
          glossaryDensityScore: 0.1,
          revisitationScore: 0.1,
          explicitEmphasisScore: 0.1,
          persistenceSignalScore: 0.1,
        },
        attenuation: {
          repetitionDecay: 1,
          refractoryPenalty: 1,
          cooldownPenalty: 1,
        },
        neighborhood: {
          relatedCategories: ["affect_transition"],
          glossaryAnchors: [],
          affectAdjacency: [],
          continuityCues: [],
        },
        processingMode: {
          selectedMode: null,
          candidateModes: [],
          modeConfidence: 0.44,
          uncertainty: 0.66,
          rationaleTrace: [],
          noModeReason: "competing_weak_modes",
          materialPriorities: {
            observations: 0.8,
            glossary: 0.2,
            notes: 0.1,
            responses: 0.2,
            neighborhood: 0.3,
          },
        },
      },
      archivedAt: null,
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-05-31T10:00:00.000Z",
    });

    const { GET } = await import("@/app/api/latent/snapshots/[id]/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots/latent-2"), {
      params: Promise.resolve({ id: "latent-2" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.snapshot.summary.toLowerCase()).not.toContain("no_mode");
    expect(body.snapshot.summary.toLowerCase()).not.toContain("exploratory");
    expect(body.snapshot.lifecycle).toEqual({ centerState: "possible", noCenterReason: null });
    expect(body.snapshot.lifecycle).not.toHaveProperty("processingMode");
  });
});
