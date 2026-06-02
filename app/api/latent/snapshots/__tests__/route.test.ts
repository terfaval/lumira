import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listSnapshotsByUser = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-latent-repository", () => ({
  createLatentRepository: () => ({
    listSnapshotsByUser,
  }),
}));

describe("/api/latent/snapshots route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listSnapshotsByUser.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/latent/snapshots/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots"));

    expect(response.status).toBe(401);
  });

  it("lists latent snapshots for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listSnapshotsByUser.mockResolvedValue([
      {
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
        signals: [
          {
            id: "signal-1",
            snapshotId: "latent-1",
            userId: "user-a",
            signalType: "reflective_opportunity_possibility",
            label: "Reflective center candidate: agency_state",
            description: "internal",
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
            createdAt: "2026-05-31T10:00:00.000Z",
            updatedAt: "2026-05-31T10:00:00.000Z",
          },
        ],
        suggestions: [
          {
            id: "suggestion-1",
            snapshotId: "latent-1",
            userId: "user-a",
            suggestionType: "possible_opening",
            phrasing: "A gentle reflective opening might relate here.",
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
            createdAt: "2026-05-31T10:00:00.000Z",
            updatedAt: "2026-05-31T10:00:00.000Z",
          },
        ],
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
            candidateModes: [],
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
      },
    ]);

    const { GET } = await import("@/app/api/latent/snapshots/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots"));

    expect(response.status).toBe(200);
    expect(listSnapshotsByUser).toHaveBeenCalledWith("user-a");
    const body = await response.json();
    expect(body.snapshots).toHaveLength(1);
    expect(body.snapshots[0].summary.toLowerCase()).not.toContain("agency_oriented");
    expect(body.snapshots[0].lifecycle).toEqual({ centerState: "stabilized", noCenterReason: null });
    expect(body.snapshots[0].lifecycle).not.toHaveProperty("centerCategory");
    expect(body.snapshots[0].lifecycle).not.toHaveProperty("centerScore");
    expect(body.snapshots[0].lifecycle).not.toHaveProperty("processingMode");
    expect(body.snapshots[0].signals).toEqual([]);
    expect(body.snapshots[0].suggestions).toHaveLength(1);
  });
});
