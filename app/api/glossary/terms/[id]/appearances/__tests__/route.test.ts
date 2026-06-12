import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getTermById = vi.fn();
const listAppearanceRecordsByTerm = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    getTermById,
    listAppearanceRecordsByTerm,
  }),
}));

describe("/api/glossary/terms/[id]/appearances route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getTermById.mockReset();
    listAppearanceRecordsByTerm.mockReset();
  });

  it("lists appearance records for the resolved user and term", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getTermById.mockResolvedValue({ id: "term-1" });
    listAppearanceRecordsByTerm.mockResolvedValue([]);

    const { GET } = await import("@/app/api/glossary/terms/[id]/appearances/route");
    const response = await GET(new Request("http://localhost/api/glossary/terms/term-1/appearances"), {
      params: Promise.resolve({ id: "term-1" }),
    });

    expect(response.status).toBe(200);
    expect(getTermById).toHaveBeenCalledWith("term-1", "user-a");
    expect(listAppearanceRecordsByTerm).toHaveBeenCalledWith("term-1", "user-a");
  });

  it("returns 404 when the term is not owned by the resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getTermById.mockResolvedValue(null);

    const { GET } = await import("@/app/api/glossary/terms/[id]/appearances/route");
    const response = await GET(new Request("http://localhost/api/glossary/terms/term-1/appearances"), {
      params: Promise.resolve({ id: "term-1" }),
    });

    expect(response.status).toBe(404);
  });
});
