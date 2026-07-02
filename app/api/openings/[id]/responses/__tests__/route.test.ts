import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getOpeningById = vi.fn();
const listOpeningResponseAssociationsByOpening = vi.fn();
const createResponse = vi.fn();
const createObjectAssociation = vi.fn();
const createOpeningActivationEvent = vi.fn();
const createOpeningResponseAssociation = vi.fn();
const createThreadAssociation = vi.fn();
const removeOpeningResponseAssociation = vi.fn();
const getThreadById = vi.fn();
const createThread = vi.fn();
const createThreadObjectAssociation = vi.fn();
const listAssociationsByThread = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    getOpeningById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    listOpeningResponseAssociationsByOpening,
    createResponse,
    createObjectAssociation,
    createOpeningActivationEvent,
    createOpeningResponseAssociation,
    createThreadAssociation,
    removeOpeningResponseAssociation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    createThread,
    getThreadById,
    createObjectAssociation: createThreadObjectAssociation,
    listAssociationsByThread,
  }),
}));

describe("/api/openings/[id]/responses route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getOpeningById.mockReset();
    listOpeningResponseAssociationsByOpening.mockReset();
    listOpeningResponseAssociationsByOpening.mockResolvedValue([]);
    createResponse.mockReset();
    createObjectAssociation.mockReset();
    createOpeningActivationEvent.mockReset();
    createOpeningResponseAssociation.mockReset();
    createThreadAssociation.mockReset();
    removeOpeningResponseAssociation.mockReset();
    createThread.mockReset();
    getThreadById.mockReset();
    createThreadObjectAssociation.mockReset();
    listAssociationsByThread.mockReset();
  });

  it("lists opening-response associations for the resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({ id: "opening-1" });
    listOpeningResponseAssociationsByOpening.mockResolvedValue([]);

    const { GET } = await import("@/app/api/openings/[id]/responses/route");
    const response = await GET(new Request("http://localhost/api/openings/opening-1/responses"), {
      params: Promise.resolve({ id: "opening-1" }),
    });

    expect(response.status).toBe(200);
    expect(listOpeningResponseAssociationsByOpening).toHaveBeenCalledWith("opening-1", "user-a");
  });

  it("creates user-authored response linked to opening lineage", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      provenance: {
        sourceObjects: ["obj-1"],
      },
    });
    createResponse.mockResolvedValue({ id: "response-1" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-1" });
    createThread.mockResolvedValue({ id: "thread-1" });
    createThreadObjectAssociation.mockResolvedValue({ id: "thread-obj-assoc-1" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-1" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-1" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-1" });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "After opening",
          responseText: "I stayed with the image without forcing meaning.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(201);
    expect(createResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        title: "After opening",
      }),
    );
    expect(createOpeningActivationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        openingId: "opening-1",
        openingResponseContext: "response_authored",
        responseId: "response-1",
      }),
    );
    expect(createObjectAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-1",
        reflectiveObjectId: "obj-1",
      }),
    );
    expect(createThread).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        title: "After opening",
      }),
    );
    expect(createThreadObjectAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        reflectiveObjectId: "obj-1",
      }),
    );
    expect(createThreadAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-1",
        threadId: "thread-1",
      }),
    );
    expect(createOpeningResponseAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-1",
        threadId: "thread-1",
      }),
    );
  });

  it("preserves existing response save behavior when request already provides a thread", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      provenance: {
        sourceObjects: ["obj-1"],
      },
    });
    getThreadById.mockResolvedValue({ id: "thread-existing" });
    listAssociationsByThread.mockResolvedValue([
      {
        reflectiveObjectId: "obj-1",
      },
    ]);
    createResponse.mockResolvedValue({ id: "response-1" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-1" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-1" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-1" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-1" });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Continue existing thread",
          responseText: "I returned to the same reflective line.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
          threadId: "thread-existing",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(201);
    expect(getThreadById).toHaveBeenCalledWith("thread-existing", "user-a");
    expect(listAssociationsByThread).toHaveBeenCalledWith("thread-existing", "user-a");
    expect(createThread).not.toHaveBeenCalled();
    expect(createThreadObjectAssociation).not.toHaveBeenCalled();
    expect(createThreadAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-1",
        threadId: "thread-existing",
      }),
    );
    expect(createOpeningResponseAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-1",
        threadId: "thread-existing",
      }),
    );
  });

  it("reuses an existing opening-linked thread when threadId is omitted", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      provenance: {
        sourceObjects: ["obj-1"],
      },
    });
    listOpeningResponseAssociationsByOpening.mockResolvedValue([
      {
        threadId: "thread-existing",
      },
    ]);
    getThreadById.mockResolvedValue({ id: "thread-existing" });
    listAssociationsByThread.mockResolvedValue([
      {
        reflectiveObjectId: "obj-1",
      },
    ]);
    createResponse.mockResolvedValue({ id: "response-2" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-2" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-2" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-2" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-2" });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Reuse existing thread",
          responseText: "I am continuing the same line.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(201);
    expect(listOpeningResponseAssociationsByOpening).toHaveBeenCalledWith("opening-1", "user-a");
    expect(getThreadById).toHaveBeenCalledWith("thread-existing", "user-a");
    expect(createThread).not.toHaveBeenCalled();
    expect(createThreadAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-2",
        threadId: "thread-existing",
      }),
    );
    expect(createOpeningResponseAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-2",
        threadId: "thread-existing",
      }),
    );
  });

  it("reuses a preselected thread attached to opening provenance before looking at response history", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      provenance: {
        sourceObjects: ["obj-1"],
        sourceThreads: ["thread-from-selection"],
      },
    });
    getThreadById.mockResolvedValue({ id: "thread-from-selection" });
    listAssociationsByThread.mockResolvedValue([
      {
        reflectiveObjectId: "obj-1",
      },
    ]);
    createResponse.mockResolvedValue({ id: "response-3" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-3" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-3" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-3" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-3" });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Use selected thread",
          responseText: "The first response should stay inside the selected thread.",
          openingActivationContext: "reflective_space_surface",
          openingResponseContext: "response_authored",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(201);
    expect(getThreadById).toHaveBeenCalledWith("thread-from-selection", "user-a");
    expect(listOpeningResponseAssociationsByOpening).not.toHaveBeenCalled();
    expect(createThread).not.toHaveBeenCalled();
    expect(createThreadAssociation).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: "response-3",
        threadId: "thread-from-selection",
      }),
    );
  });

  it("rejects a supplied thread when its object lineage does not overlap the opening provenance", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({
      id: "opening-1",
      provenance: {
        sourceObjects: ["obj-1"],
      },
    });
    getThreadById.mockResolvedValue({ id: "thread-mismatch" });
    listAssociationsByThread.mockResolvedValue([
      {
        reflectiveObjectId: "obj-2",
      },
    ]);

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Wrong thread",
          responseText: "This should not attach.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
          threadId: "thread-mismatch",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Reflective thread does not match opening object lineage.",
    });
    expect(createResponse).not.toHaveBeenCalled();
    expect(createThreadAssociation).not.toHaveBeenCalled();
  });

  it("does not create responses when opening activation context is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({ id: "opening-1" });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Missing context",
          responseText: "No explicit context.",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(400);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("removes opening-response association explicitly", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getOpeningById.mockResolvedValue({ id: "opening-1" });
    removeOpeningResponseAssociation.mockResolvedValue(true);

    const { DELETE } = await import("@/app/api/openings/[id]/responses/route");
    const response = await DELETE(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "DELETE",
        body: JSON.stringify({ responseId: "response-1" }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(200);
    expect(removeOpeningResponseAssociation).toHaveBeenCalledWith("opening-1", "response-1", "user-a");
  });
});
