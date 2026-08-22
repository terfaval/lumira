import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getById = vi.fn();
const listCandidates = vi.fn();
const listCandidatesByReflectiveObject = vi.fn();
const generateGlossaryCandidatesForReflectiveObject = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    listCandidates,
    listCandidatesByReflectiveObject,
  }),
}));

vi.mock("@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object", () => ({
  generateGlossaryCandidatesForReflectiveObject,
}));

describe("/api/reflective-objects/[id]/glossary-candidates route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getById.mockReset();
    listCandidates.mockReset();
    listCandidatesByReflectiveObject.mockReset();
    generateGlossaryCandidatesForReflectiveObject.mockReset();
    listCandidates.mockResolvedValue([]);
  });

  it("requires reflective object ownership before listing candidates", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    listCandidates.mockResolvedValue([
      {
        id: "cand-1",
        reflectiveObjectId: "obj-1",
        normalizedKey: "father",
        sourceCategory: "actor",
        createdAt: "2026-06-12T00:00:00.000Z",
        lastSeenAt: "2026-06-12T00:00:00.000Z",
      },
      {
        id: "cand-2",
        reflectiveObjectId: "obj-9",
        normalizedKey: "father",
        sourceCategory: "actor",
        createdAt: "2026-06-19T00:00:00.000Z",
        lastSeenAt: "2026-06-19T00:00:00.000Z",
      },
    ]);
    listCandidatesByReflectiveObject.mockResolvedValue([
      {
        id: "cand-1",
        reflectiveObjectId: "obj-1",
        normalizedKey: "father",
        sourceCategory: "actor",
        candidateClass: "ambiguous_match_candidate",
        proposedEntityIds: ["term-1", "term-2"],
        createdAt: "2026-06-12T00:00:00.000Z",
        lastSeenAt: "2026-06-12T00:00:00.000Z",
      },
    ]);

    const { GET } = await import("@/app/api/reflective-objects/[id]/glossary-candidates/route");
    const response = await GET(new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates"), {
      params: Promise.resolve({ id: "obj-1" }),
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(getById).toHaveBeenCalledWith("obj-1", "user-a");
    expect(listCandidates).toHaveBeenCalledWith("user-a");
    expect(listCandidatesByReflectiveObject).toHaveBeenCalledWith("user-a", "obj-1");
    expect(json.candidates[0].candidateClass).toBe("ambiguous_match_candidate");
    expect(json.candidates[0].proposedEntityIds).toEqual(["term-1", "term-2"]);
    expect(json.candidates[0].continuityVisibility).toEqual({
      possibleContinuity: true,
      dreamCount: 2,
      firstSeenAt: "2026-06-12T00:00:00.000Z",
      lastSeenAt: "2026-06-19T00:00:00.000Z",
    });
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

  it("routes POST generation through the shared observation authority seam", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    generateGlossaryCandidatesForReflectiveObject.mockResolvedValue([
      {
        id: "cand-1",
        reflectiveObjectId: "obj-1",
      },
    ]);
    listCandidates.mockResolvedValue([
      {
        id: "cand-1",
        reflectiveObjectId: "obj-1",
        normalizedKey: "friend",
        sourceCategory: "actor",
        candidateClass: "new_candidate",
        proposedEntityIds: [],
        createdAt: "2026-05-24T00:00:00.000Z",
        lastSeenAt: "2026-05-24T00:00:00.000Z",
      },
    ]);

    const { POST } = await import("@/app/api/reflective-objects/[id]/glossary-candidates/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates", { method: "POST" }),
      { params: Promise.resolve({ id: "obj-1" }) },
    );

    const json = await response.json();
    expect(response.status).toBe(201);
    expect(generateGlossaryCandidatesForReflectiveObject).toHaveBeenCalledWith({
      userId: "user-a",
      reflectiveObjectId: "obj-1",
    });
    expect(json.candidates).toEqual([
      expect.objectContaining({
        id: "cand-1",
        reflectiveObjectId: "obj-1",
      }),
    ]);
  });

  it("returns only projected generated candidates from the shared authority result", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    generateGlossaryCandidatesForReflectiveObject.mockResolvedValue([
      {
        id: "cand-1",
        reflectiveObjectId: "obj-1",
      },
    ]);
    listCandidates.mockResolvedValue([
      {
        id: "cand-1",
        reflectiveObjectId: "obj-1",
        normalizedKey: "dori",
        sourceCategory: "actor",
        candidateClass: "match_candidate",
        proposedEntityIds: ["term-1"],
        createdAt: "2026-06-12T00:00:00.000Z",
        lastSeenAt: "2026-06-12T00:00:00.000Z",
      },
      {
        id: "cand-2",
        reflectiveObjectId: "obj-1",
        normalizedKey: "other",
        sourceCategory: "actor",
        candidateClass: "new_candidate",
        proposedEntityIds: [],
        createdAt: "2026-06-13T00:00:00.000Z",
        lastSeenAt: "2026-06-13T00:00:00.000Z",
      },
    ]);

    const { POST } = await import("@/app/api/reflective-objects/[id]/glossary-candidates/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates", { method: "POST" }),
      { params: Promise.resolve({ id: "obj-1" }) },
    );

    const json = await response.json();
    expect(response.status).toBe(201);
    expect(json.candidates).toHaveLength(1);
    expect(json.candidates[0]).toEqual(
      expect.objectContaining({
        id: "cand-1",
        normalizedKey: "dori",
      }),
    );
  });
});
