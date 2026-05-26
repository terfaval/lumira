import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const setCandidateLifecycle = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    setCandidateLifecycle,
  }),
}));

describe("/api/glossary/candidates/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    setCandidateLifecycle.mockReset();
  });

  it("scopes lifecycle update by resolved user identity", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    setCandidateLifecycle.mockResolvedValue({ id: "cand-1", state: "suppressed" });

    const { PATCH } = await import("@/app/api/glossary/candidates/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/glossary/candidates/cand-1", {
        method: "PATCH",
        body: JSON.stringify({ nextState: "suppressed", suppressionReason: "too intense" }),
      }),
      { params: Promise.resolve({ id: "cand-1" }) },
    );

    expect(response.status).toBe(200);
    expect(setCandidateLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "cand-1",
        userId: "user-a",
      }),
    );
  });

  it("returns 404 when candidate is not owned by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    setCandidateLifecycle.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/glossary/candidates/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/glossary/candidates/cand-1", {
        method: "PATCH",
        body: JSON.stringify({ nextState: "ignored" }),
      }),
      { params: Promise.resolve({ id: "cand-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
