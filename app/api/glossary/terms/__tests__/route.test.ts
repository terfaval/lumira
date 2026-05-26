import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listTerms = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    listTerms,
  }),
}));

describe("/api/glossary/terms route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listTerms.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/glossary/terms/route");
    const response = await GET(new Request("http://localhost/api/glossary/terms"));

    expect(response.status).toBe(401);
  });

  it("lists terms only for resolved user id", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listTerms.mockResolvedValue([]);

    const { GET } = await import("@/app/api/glossary/terms/route");
    const response = await GET(new Request("http://localhost/api/glossary/terms"));

    expect(response.status).toBe(200);
    expect(listTerms).toHaveBeenCalledWith("user-a");
  });
});
