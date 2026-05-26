import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listOpeningActivationEventsByWindow = vi.fn();
const getResponseById = vi.fn();
const listAssociationsByResponse = vi.fn();
const getOpeningById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    getOpeningById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    listOpeningActivationEventsByWindow,
    getResponseById,
    listAssociationsByResponse,
  }),
}));

describe("/api/openings/dialogues route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listOpeningActivationEventsByWindow.mockReset();
    getResponseById.mockReset();
    listAssociationsByResponse.mockReset();
    getOpeningById.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/openings/dialogues/route");
    const response = await GET(new Request("http://localhost/api/openings/dialogues"));

    expect(response.status).toBe(401);
  });

  it("returns bounded dialogue window and preserves activation_without_response", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    listOpeningActivationEventsByWindow
      .mockResolvedValueOnce([
        {
          id: "event-1",
          userId: "user-a",
          openingId: "opening-1",
          activationSource: "reflective_space_surface",
          activationContext: "reflective_space_surface",
          openingResponseContext: "activation_without_response",
          responseId: null,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z",
        },
        {
          id: "event-2",
          userId: "user-a",
          openingId: "opening-2",
          activationSource: "continuity_revisit",
          activationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
          responseId: "response-1",
          createdAt: "2026-05-24T23:00:00.000Z",
          updatedAt: "2026-05-24T23:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);

    getOpeningById.mockImplementation(async (openingId: string) => ({
      id: openingId,
      userId: "user-a",
      openingType: "continuity_noticing",
      tone: "gentle",
      utterance: "This may connect nearby.",
      state: "activated",
      visibility: "opened",
      suppressionState: "none",
      suppressionDuration: null,
      suppressionReason: null,
      suppressionExpiry: { at: null },
      suppressionRevisitEligibility: "revisitable_dormant",
      suppressionReactivatedAt: null,
      provenance: {
        sourceObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: [openingId === "opening-2" ? "thread-2" : "thread-1"],
        sourceResponses: [],
        latentSnapshotReference: "latent-1",
        confidenceBand: "tentative",
        openingGenerationContext: "phase8b_test",
      },
      activatedAt: null,
      dismissedAt: null,
      archivedAt: null,
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    }));

    getResponseById.mockResolvedValue({
      id: "response-1",
      userId: "user-a",
      title: "After opening",
      responseText: "I stayed with ambiguity.",
      state: "active",
      visibility: "ambient",
      source: "manual_entry",
      archivedAt: null,
      createdAt: "2026-05-24T23:01:00.000Z",
      updatedAt: "2026-05-24T23:01:00.000Z",
    });

    listAssociationsByResponse.mockResolvedValue([
      {
        id: "assoc-thread-1",
        userId: "user-a",
        responseId: "response-1",
        kind: "reflective_thread",
        openingId: null,
        reflectiveObjectId: null,
        threadId: "thread-2",
        associationLabel: null,
        createdAt: "2026-05-24T23:01:00.000Z",
        updatedAt: "2026-05-24T23:01:00.000Z",
      },
    ]);

    const { GET } = await import("@/app/api/openings/dialogues/route");
    const response = await GET(new Request("http://localhost/api/openings/dialogues?limit=1"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.window.mode).toBe("bounded_archive_window");
    expect(payload.window.hasMore).toBe(true);
    expect(payload.dialogues).toHaveLength(1);
    expect(payload.dialogues[0].lineage.openingResponseContext).toBe("activation_without_response");
  });

  it("supports thread-scoped retrieval without mutation behavior", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    listOpeningActivationEventsByWindow
      .mockResolvedValueOnce([
        {
          id: "event-1",
          userId: "user-a",
          openingId: "opening-1",
          activationSource: "reflective_space_surface",
          activationContext: "reflective_space_surface",
          openingResponseContext: "activation_without_response",
          responseId: null,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);

    getOpeningById.mockResolvedValue({
      id: "opening-1",
      userId: "user-a",
      openingType: "continuity_noticing",
      tone: "gentle",
      utterance: "This may connect nearby.",
      state: "activated",
      visibility: "opened",
      suppressionState: "none",
      suppressionDuration: null,
      suppressionReason: null,
      suppressionExpiry: { at: null },
      suppressionRevisitEligibility: "revisitable_dormant",
      suppressionReactivatedAt: null,
      provenance: {
        sourceObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: ["thread-x"],
        sourceResponses: [],
        latentSnapshotReference: "latent-1",
        confidenceBand: "tentative",
        openingGenerationContext: "phase8b_test",
      },
      activatedAt: null,
      dismissedAt: null,
      archivedAt: null,
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    });

    const { GET } = await import("@/app/api/openings/dialogues/route");
    const response = await GET(new Request("http://localhost/api/openings/dialogues?threadId=thread-x"));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.dialogues).toHaveLength(1);
    expect(getResponseById).not.toHaveBeenCalled();
  });
});
