import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getResponseById = vi.fn();
const listAssociationsByResponse = vi.fn();
const updateResponse = vi.fn();
const archiveResponse = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    getResponseById,
    listAssociationsByResponse,
    updateResponse,
    archiveResponse,
  }),
}));

describe("/api/responses/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getResponseById.mockReset();
    listAssociationsByResponse.mockReset();
    updateResponse.mockReset();
    archiveResponse.mockReset();
  });

  it("scopes response lookup to resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getResponseById.mockResolvedValue({ id: "response-1" });
    listAssociationsByResponse.mockResolvedValue([]);

    const { GET } = await import("@/app/api/responses/[id]/route");
    const response = await GET(new Request("http://localhost/api/responses/response-1"), {
      params: Promise.resolve({ id: "response-1" }),
    });

    expect(response.status).toBe(200);
    expect(getResponseById).toHaveBeenCalledWith("response-1", "user-a");
    expect(listAssociationsByResponse).toHaveBeenCalledWith("response-1", "user-a");
  });

  it("scopes archive operation to resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    archiveResponse.mockResolvedValue({ id: "response-1" });

    const { DELETE } = await import("@/app/api/responses/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/responses/response-1"), {
      params: Promise.resolve({ id: "response-1" }),
    });

    expect(response.status).toBe(200);
    expect(archiveResponse).toHaveBeenCalledWith("response-1", "user-a");
  });
});
