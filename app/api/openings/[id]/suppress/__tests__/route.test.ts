import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const setSuppression = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    setSuppression,
  }),
}));

describe("/api/openings/[id]/suppress route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    setSuppression.mockReset();
  });

  it("applies suppression state for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    setSuppression.mockResolvedValue({ id: "opening-1", suppressionState: "suppressed" });

    const { POST } = await import("@/app/api/openings/[id]/suppress/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/suppress", {
        method: "POST",
        body: JSON.stringify({
          nextState: "suppressed",
          duration: "temporary",
          suppressionExpiryMinutes: 120,
          suppressionReason: "not now",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(200);
    expect(setSuppression).toHaveBeenCalledWith({
      openingId: "opening-1",
      userId: "user-a",
      nextState: "suppressed",
      duration: "temporary",
      suppressionReason: "not now",
      suppressionExpiryMinutes: 120,
    });
  });

  it("rejects unsuppress attempts on suppression route", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    const { POST } = await import("@/app/api/openings/[id]/suppress/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/suppress", {
        method: "POST",
        body: JSON.stringify({
          nextState: "none",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(400);
  });
});
