import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listResponsesByUser = vi.fn();
const createResponse = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    listResponsesByUser,
    createResponse,
  }),
}));

describe("/api/responses route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listResponsesByUser.mockReset();
    createResponse.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/responses/route");
    const response = await GET(new Request("http://localhost/api/responses"));

    expect(response.status).toBe(401);
  });

  it("lists responses for resolved user id", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listResponsesByUser.mockResolvedValue([]);

    const { GET } = await import("@/app/api/responses/route");
    const response = await GET(new Request("http://localhost/api/responses"));

    expect(response.status).toBe(200);
    expect(listResponsesByUser).toHaveBeenCalledWith("user-a");
  });
});
