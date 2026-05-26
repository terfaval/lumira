import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getThreadById = vi.fn();
const createGlossaryAssociation = vi.fn();
const getTermById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    getThreadById,
    createGlossaryAssociation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    getTermById,
  }),
}));

describe("/api/threads/[id]/glossary-terms route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getThreadById.mockReset();
    createGlossaryAssociation.mockReset();
    getTermById.mockReset();
  });

  it("requires thread and glossary ownership before linking", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getThreadById.mockResolvedValue({ id: "thread-1" });
    getTermById.mockResolvedValue({ id: "term-1" });
    createGlossaryAssociation.mockResolvedValue({ id: "assoc-1" });

    const { POST } = await import("@/app/api/threads/[id]/glossary-terms/route");
    const response = await POST(
      new Request("http://localhost/api/threads/thread-1/glossary-terms", {
        method: "POST",
        body: JSON.stringify({ glossaryTermId: "term-1" }),
      }),
      { params: Promise.resolve({ id: "thread-1" }) },
    );

    expect(response.status).toBe(201);
    expect(getThreadById).toHaveBeenCalledWith("thread-1", "user-a");
    expect(getTermById).toHaveBeenCalledWith("term-1", "user-a");
  });

  it("returns 404 when glossary term is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getThreadById.mockResolvedValue({ id: "thread-1" });
    getTermById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/threads/[id]/glossary-terms/route");
    const response = await POST(
      new Request("http://localhost/api/threads/thread-1/glossary-terms", {
        method: "POST",
        body: JSON.stringify({ glossaryTermId: "term-1" }),
      }),
      { params: Promise.resolve({ id: "thread-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
