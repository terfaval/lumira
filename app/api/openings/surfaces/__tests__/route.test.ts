import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listOpeningSurfacesByUser = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    listOpeningSurfacesByUser,
  }),
}));

describe("/api/openings/surfaces route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listOpeningSurfacesByUser.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/openings/surfaces/route");
    const response = await GET(new Request("http://localhost/api/openings/surfaces"));

    expect(response.status).toBe(401);
  });

  it("lists optional opening surfaces for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listOpeningSurfacesByUser.mockResolvedValue([{ openingId: "opening-1" }]);

    const { GET } = await import("@/app/api/openings/surfaces/route");
    const response = await GET(new Request("http://localhost/api/openings/surfaces"));

    expect(response.status).toBe(200);
    expect(listOpeningSurfacesByUser).toHaveBeenCalledWith("user-a");
  });
});
