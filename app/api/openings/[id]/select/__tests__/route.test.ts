import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getOpeningById = vi.fn();
const activateOpening = vi.fn();
const reactivateOpening = vi.fn();
const attachThreadToOpening = vi.fn();
const createOpeningActivationEvent = vi.fn();
const listOpeningResponseAssociationsByOpening = vi.fn();
const createThread = vi.fn();
const getThreadById = vi.fn();
const createThreadObjectAssociation = vi.fn();
const createThreadGlossaryAssociation = vi.fn();
const listAssociationsByThread = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    getOpeningById,
    activateOpening,
    reactivateOpening,
    attachThreadToOpening,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    createOpeningActivationEvent,
    listOpeningResponseAssociationsByOpening,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    createThread,
    getThreadById,
    createObjectAssociation: createThreadObjectAssociation,
    createGlossaryAssociation: createThreadGlossaryAssociation,
    listAssociationsByThread,
  }),
}));

describe("/api/openings/[id]/select route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getOpeningById.mockReset();
    activateOpening.mockReset();
    reactivateOpening.mockReset();
    attachThreadToOpening.mockReset();
    createOpeningActivationEvent.mockReset();
    listOpeningResponseAssociationsByOpening.mockReset();
    listOpeningResponseAssociationsByOpening.mockResolvedValue([]);
    createThread.mockReset();
    getThreadById.mockReset();
    createThreadObjectAssociation.mockReset();
    createThreadGlossaryAssociation.mockReset();
    listAssociationsByThread.mockReset();
  });

  it("activates a new opening, creates a durable thread center, and returns the thread route", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      state: "available",
      suppressionState: "none",
      suppressionRevisitEligibility: "revisitable_dormant",
      utterance: "Stay with the doorway for a moment.",
      provenance: {
        sourceObjects: ["obj-1"],
        sourceGlossaryTerms: ["term-1"],
        sourceThreads: [],
      },
    });
    activateOpening.mockResolvedValue({ id: "opening-1", state: "activated" });
    createOpeningActivationEvent.mockResolvedValue({ id: "event-1" });
    createThread.mockResolvedValue({ id: "thread-1" });
    createThreadObjectAssociation.mockResolvedValue({ id: "thread-obj-1" });
    createThreadGlossaryAssociation.mockResolvedValue({ id: "thread-term-1" });
    attachThreadToOpening.mockResolvedValue({
      id: "opening-1",
      provenance: {
        sourceObjects: ["obj-1"],
        sourceGlossaryTerms: ["term-1"],
        sourceThreads: ["thread-1"],
      },
    });

    const { POST } = await import("@/app/api/openings/[id]/select/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/select", {
        method: "POST",
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
    expect(createThread).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        state: "active",
      }),
    );
    expect(attachThreadToOpening).toHaveBeenCalledWith("opening-1", "user-a", "thread-1");
    await expect(response.json()).resolves.toMatchObject({
      thread: { id: "thread-1" },
      href: "/objects/obj-1/reflect/thread-1?centerStatus=new&resolution=created",
    });
  });

  it("reuses an already-linked thread for re-entry instead of creating a second center", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      state: "available",
      suppressionState: "suppressed",
      suppressionRevisitEligibility: "revisitable_dormant",
      utterance: "Return to the same threshold.",
      provenance: {
        sourceObjects: ["obj-1"],
        sourceGlossaryTerms: [],
        sourceThreads: ["thread-existing"],
      },
    });
    reactivateOpening.mockResolvedValue({ id: "opening-1", suppressionState: "none" });
    createOpeningActivationEvent.mockResolvedValue({ id: "event-2" });
    getThreadById.mockResolvedValue({ id: "thread-existing" });
    listAssociationsByThread.mockResolvedValue([{ reflectiveObjectId: "obj-1" }]);

    const { POST } = await import("@/app/api/openings/[id]/select/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/select", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(200);
    expect(reactivateOpening).toHaveBeenCalledWith({
      openingId: "opening-1",
      userId: "user-a",
      source: "manual_revisit",
    });
    expect(createThread).not.toHaveBeenCalled();
    expect(attachThreadToOpening).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      thread: { id: "thread-existing" },
      href: "/objects/obj-1/reflect/thread-existing?centerStatus=reentered&resolution=reentered",
    });
  });
});
