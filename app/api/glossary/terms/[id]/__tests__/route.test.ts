import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const updateTerm = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    updateTerm,
  }),
}));

describe("/api/glossary/terms/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    updateTerm.mockReset();
  });

  it("scopes continuity entity updates by resolved user identity", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    updateTerm.mockResolvedValue({ id: "term-1", canonicalLabel: "Night street", type: "place" });

    const { PATCH } = await import("@/app/api/glossary/terms/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/glossary/terms/term-1", {
        method: "PATCH",
        body: JSON.stringify({ canonicalLabel: "Night street", type: "place", aliases: ["the street"] }),
      }),
      { params: Promise.resolve({ id: "term-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateTerm).toHaveBeenCalledWith(
      expect.objectContaining({
        termId: "term-1",
        userId: "user-a",
        canonicalLabel: "Night street",
        type: "place",
        aliases: ["the street"],
      }),
    );
  });

  it("returns 404 when term is not owned by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    updateTerm.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/glossary/terms/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/glossary/terms/term-1", {
        method: "PATCH",
        body: JSON.stringify({ canonicalLabel: "Night street", type: "place" }),
      }),
      { params: Promise.resolve({ id: "term-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
