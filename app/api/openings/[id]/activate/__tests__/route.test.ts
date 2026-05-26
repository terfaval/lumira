import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const activateOpening = vi.fn();
const createOpeningActivationEvent = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    activateOpening,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    createOpeningActivationEvent,
  }),
}));

describe("/api/openings/[id]/activate route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    activateOpening.mockReset();
    createOpeningActivationEvent.mockReset();
  });

  it("requires explicit activation source", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    const { POST } = await import("@/app/api/openings/[id]/activate/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/activate", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("activates opening for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    activateOpening.mockResolvedValue({ id: "opening-1" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-1" });

    const { POST } = await import("@/app/api/openings/[id]/activate/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/activate", {
        method: "POST",
        body: JSON.stringify({ source: "reflective_space_surface" }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(200);
    expect(activateOpening).toHaveBeenCalledWith({
      openingId: "opening-1",
      userId: "user-a",
      source: "reflective_space_surface",
    });
    expect(createOpeningActivationEvent).toHaveBeenCalledWith({
      userId: "user-a",
      openingId: "opening-1",
      activationSource: "reflective_space_surface",
      activationContext: "reflective_space_surface",
      openingResponseContext: "activation_without_response",
    });
  });
});
