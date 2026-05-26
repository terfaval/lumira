import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const composeReflectiveSpaceViewport = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({ tag: "objects" }),
}));
vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({ tag: "observations" }),
}));
vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({ tag: "glossary" }),
}));
vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({ tag: "threads" }),
}));
vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({ tag: "openings" }),
}));
vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({ tag: "responses" }),
}));

vi.mock("@/src/reflective-space/composition/compose-reflective-space-viewport", () => ({
  composeReflectiveSpaceViewport,
}));

describe("/api/reflective-space/viewport route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    composeReflectiveSpaceViewport.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/reflective-space/viewport/route");
    const response = await GET(new Request("http://localhost/api/reflective-space/viewport"));

    expect(response.status).toBe(401);
  });

  it("composes bounded viewport payload for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    composeReflectiveSpaceViewport.mockResolvedValue({ summary: "viewport" });

    const { GET } = await import("@/app/api/reflective-space/viewport/route");
    const response = await GET(
      new Request(
        "http://localhost/api/reflective-space/viewport?centerObjectId=obj-1&objectLimit=7&dialogueLimit=5&dialogueBefore=2026-05-25T00:00:00.000Z&dialogueCursor=2026-05-25T00:00:00.000Z|event-1",
      ),
    );

    expect(response.status).toBe(200);
    expect(composeReflectiveSpaceViewport).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        centerObjectId: "obj-1",
        objectLimit: 7,
        dialogueLimit: 5,
        dialogueBeforeCreatedAt: "2026-05-25T00:00:00.000Z",
        dialogueBeforeCursor: {
          createdAt: "2026-05-25T00:00:00.000Z",
          id: "event-1",
        },
      }),
    );
  });
});
