import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getOpeningById = vi.fn();
const listOpeningResponseAssociationsByOpening = vi.fn();
const createResponse = vi.fn();
const createObjectAssociation = vi.fn();
const createOpeningActivationEvent = vi.fn();
const createOpeningResponseAssociation = vi.fn();
const removeOpeningResponseAssociation = vi.fn();
const getThreadById = vi.fn();

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
    removeOpeningResponseAssociation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    getThreadById,
  }),
}));

describe("/api/openings/[id]/responses route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getOpeningById.mockReset();
    listOpeningResponseAssociationsByOpening.mockReset();
    createResponse.mockReset();
    createObjectAssociation.mockReset();
    createOpeningActivationEvent.mockReset();
    createOpeningResponseAssociation.mockReset();
    removeOpeningResponseAssociation.mockReset();
    getThreadById.mockReset();
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
