import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getCandidateById = vi.fn();
const resolveCandidate = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    getCandidateById,
    resolveCandidate,
  }),
}));

describe("/api/glossary/candidates/[id]/resolve route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getCandidateById.mockReset();
    resolveCandidate.mockReset();
  });

  it("resolves a match candidate to its existing entity", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getCandidateById.mockResolvedValue({
      id: "cand-1",
      candidateClass: "match_candidate",
      proposedEntityIds: ["term-1"],
    });
    resolveCandidate.mockResolvedValue({
      candidate: { id: "cand-1", state: "pinned" },
      term: { id: "term-1", canonicalLabel: "Apa" },
      appearanceRecord: { id: "appearance-1", entityId: "term-1" },
    });

    const { POST } = await import("@/app/api/glossary/candidates/[id]/resolve/route");
    const response = await POST(
      new Request("http://localhost/api/glossary/candidates/cand-1/resolve", {
        method: "POST",
        body: JSON.stringify({
          resolutionType: "confirm_existing_entity",
          entityId: "term-1",
          appearanceNote: "This was clearly the same person.",
        }),
      }),
      { params: Promise.resolve({ id: "cand-1" }) },
    );

    expect(response.status).toBe(200);
    expect(resolveCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "cand-1",
        userId: "user-a",
        resolutionType: "confirm_existing_entity",
        entityId: "term-1",
      }),
    );
  });

  it("rejects ambiguous resolution choices outside the proposed entity set", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getCandidateById.mockResolvedValue({
      id: "cand-1",
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: ["term-1", "term-2"],
    });

    const { POST } = await import("@/app/api/glossary/candidates/[id]/resolve/route");
    const response = await POST(
      new Request("http://localhost/api/glossary/candidates/cand-1/resolve", {
        method: "POST",
        body: JSON.stringify({
          resolutionType: "select_existing_entity",
          entityId: "term-9",
        }),
      }),
      { params: Promise.resolve({ id: "cand-1" }) },
    );

    expect(response.status).toBe(400);
    expect(resolveCandidate).not.toHaveBeenCalled();
  });

  it("returns 404 when the candidate is not owned by the resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getCandidateById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/glossary/candidates/[id]/resolve/route");
    const response = await POST(
      new Request("http://localhost/api/glossary/candidates/cand-1/resolve", {
        method: "POST",
        body: JSON.stringify({
          resolutionType: "create_new_entity",
        }),
      }),
      { params: Promise.resolve({ id: "cand-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("allows ambiguous candidates to create a new continuity entity", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getCandidateById.mockResolvedValue({
      id: "cand-1",
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: ["term-1", "term-2"],
    });
    resolveCandidate.mockResolvedValue({
      candidate: { id: "cand-1", state: "pinned" },
      term: { id: "term-new", canonicalLabel: "Unknown Ex-partner", type: "role" },
      appearanceRecord: { id: "appearance-1", entityId: "term-new" },
    });

    const { POST } = await import("@/app/api/glossary/candidates/[id]/resolve/route");
    const response = await POST(
      new Request("http://localhost/api/glossary/candidates/cand-1/resolve", {
        method: "POST",
        body: JSON.stringify({
          resolutionType: "create_new_entity",
          canonicalLabel: "Unknown Ex-partner",
          type: "role",
          appearanceNote: "This felt like the same role, but not a known person.",
        }),
      }),
      { params: Promise.resolve({ id: "cand-1" }) },
    );

    expect(response.status).toBe(200);
    expect(resolveCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "cand-1",
        userId: "user-a",
        resolutionType: "create_new_entity",
        canonicalLabel: "Unknown Ex-partner",
        type: "role",
      }),
    );
  });
});
