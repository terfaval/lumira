import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getById = vi.fn();
const listByReflectiveObject = vi.fn();
const listCandidatesByReflectiveObject = vi.fn();
const upsertCandidates = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({
    listByReflectiveObject,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    listCandidatesByReflectiveObject,
    upsertCandidates,
  }),
}));

describe("/api/reflective-objects/[id]/glossary-candidates route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getById.mockReset();
    listByReflectiveObject.mockReset();
    listCandidatesByReflectiveObject.mockReset();
    upsertCandidates.mockReset();
  });

  it("requires reflective object ownership before listing candidates", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    listCandidatesByReflectiveObject.mockResolvedValue([]);

    const { GET } = await import("@/app/api/reflective-objects/[id]/glossary-candidates/route");
    const response = await GET(new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates"), {
      params: Promise.resolve({ id: "obj-1" }),
    });

    expect(response.status).toBe(200);
    expect(getById).toHaveBeenCalledWith("obj-1", "user-a");
    expect(listCandidatesByReflectiveObject).toHaveBeenCalledWith("user-a", "obj-1");
  });

  it("returns 404 when reflective object is not owned by user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/reflective-objects/[id]/glossary-candidates/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates", { method: "POST" }),
      { params: Promise.resolve({ id: "obj-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("extracts and persists candidates from observation fragments", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    listByReflectiveObject.mockResolvedValue([
      {
        id: "obs-1",
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        source: "system_descriptive_extract",
        summary: "summary",
        uncertaintyNotes: [],
        semanticPolicyResult: "accept",
        semanticPolicyReasons: [],
        provenanceTier: "system_extract",
        summaryTrace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_semantic_guardrails_v1",
        status: "active",
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
        fragments: [
          {
            id: "frag-1",
            observationId: "obs-1",
            userId: "user-a",
            reflectiveObjectId: "obj-1",
            category: "actor",
            fragmentText: "My friend",
            evidenceAdequacy: "strong_span",
            evidence: { snippet: "My friend", spanStart: 0, spanEnd: 9, contextLabel: "raw_sentence" },
            uncertaintyNote: null,
            position: 0,
            createdAt: "2026-05-24T00:00:00.000Z",
            updatedAt: "2026-05-24T00:00:00.000Z",
          },
        ],
      },
    ]);
    upsertCandidates.mockResolvedValue([{ id: "cand-1" }]);

    const { POST } = await import("@/app/api/reflective-objects/[id]/glossary-candidates/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates", { method: "POST" }),
      { params: Promise.resolve({ id: "obj-1" }) },
    );

    expect(response.status).toBe(201);
    expect(upsertCandidates).toHaveBeenCalledTimes(1);
    expect(upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          reflectiveObjectId: "obj-1",
          sourceObservationId: "obs-1",
          sourceObservationFragmentId: "frag-1",
        }),
      ]),
    );
  });
});
