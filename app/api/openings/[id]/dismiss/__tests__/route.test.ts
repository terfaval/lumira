import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const dismissOpening = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    dismissOpening,
  }),
}));

describe("/api/openings/[id]/dismiss route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    dismissOpening.mockReset();
  });

  it("dismisses opening for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    dismissOpening.mockResolvedValue({ id: "opening-1", state: "dismissed" });

    const { POST } = await import("@/app/api/openings/[id]/dismiss/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/dismiss", { method: "POST" }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(200);
    expect(dismissOpening).toHaveBeenCalledWith("opening-1", "user-a");
  });
});
