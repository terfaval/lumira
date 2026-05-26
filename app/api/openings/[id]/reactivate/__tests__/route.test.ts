import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const reactivateOpening = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    reactivateOpening,
  }),
}));

describe("/api/openings/[id]/reactivate route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    reactivateOpening.mockReset();
  });

  it("rejects non-revisit activation source", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    const { POST } = await import("@/app/api/openings/[id]/reactivate/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/reactivate", {
        method: "POST",
        body: JSON.stringify({ source: "reflective_space_surface" }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("reactivates suppressed opening from explicit revisit source", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    reactivateOpening.mockResolvedValue({ id: "opening-1", suppressionState: "none" });

    const { POST } = await import("@/app/api/openings/[id]/reactivate/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/reactivate", {
        method: "POST",
        body: JSON.stringify({ source: "manual_revisit" }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(200);
    expect(reactivateOpening).toHaveBeenCalledWith({
      openingId: "opening-1",
      userId: "user-a",
      source: "manual_revisit",
    });
  });
});
