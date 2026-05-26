import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const renameTerm = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    renameTerm,
  }),
}));

describe("/api/glossary/terms/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    renameTerm.mockReset();
  });

  it("scopes term rename by resolved user identity", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    renameTerm.mockResolvedValue({ id: "term-1", displayLabel: "Night street" });

    const { PATCH } = await import("@/app/api/glossary/terms/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/glossary/terms/term-1", {
        method: "PATCH",
        body: JSON.stringify({ nextDisplayLabel: "Night street" }),
      }),
      { params: Promise.resolve({ id: "term-1" }) },
    );

    expect(response.status).toBe(200);
    expect(renameTerm).toHaveBeenCalledWith(
      expect.objectContaining({
        termId: "term-1",
        userId: "user-a",
        nextDisplayLabel: "Night street",
      }),
    );
  });

  it("returns 404 when term is not owned by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    renameTerm.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/glossary/terms/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/glossary/terms/term-1", {
        method: "PATCH",
        body: JSON.stringify({ nextDisplayLabel: "Night street" }),
      }),
      { params: Promise.resolve({ id: "term-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
