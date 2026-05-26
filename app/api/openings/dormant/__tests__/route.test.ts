import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listDormantSuppressedOpeningsByUser = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    listDormantSuppressedOpeningsByUser,
  }),
}));

describe("/api/openings/dormant route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listDormantSuppressedOpeningsByUser.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/openings/dormant/route");
    const response = await GET(new Request("http://localhost/api/openings/dormant"));

    expect(response.status).toBe(401);
  });

  it("lists dormant suppressed openings for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listDormantSuppressedOpeningsByUser.mockResolvedValue([{ id: "opening-1" }]);

    const { GET } = await import("@/app/api/openings/dormant/route");
    const response = await GET(new Request("http://localhost/api/openings/dormant"));

    expect(response.status).toBe(200);
    expect(listDormantSuppressedOpeningsByUser).toHaveBeenCalledWith("user-a");
  });
});
