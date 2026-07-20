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
const createReflectionCandidate = vi.fn();
const getReflectionCandidateBySourceResponse = vi.fn();
const getReflectionCandidateById = vi.fn();
const listReflectionCandidatesByThread = vi.fn();
const appendReflectionCandidateEvidence = vi.fn();
const admitReflection = vi.fn();

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

vi.mock("@/src/infrastructure/supabase/repositories/create-reflection-candidate-repository", () => ({
  createReflectionCandidateRepository: () => ({
    createCandidate: createReflectionCandidate,
    getCandidateById: getReflectionCandidateById,
    getCandidateBySourceResponse: getReflectionCandidateBySourceResponse,
    listCandidatesByThread: listReflectionCandidatesByThread,
    appendEvidence: appendReflectionCandidateEvidence,
    getCandidateByIdIncludingArchived: getReflectionCandidateById,
    listEvidenceByCandidate: vi.fn(),
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflection-repository", () => ({
  createReflectionRepository: () => ({
    admitReflection,
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
    createReflectionCandidate.mockReset();
    getReflectionCandidateBySourceResponse.mockReset();
    getReflectionCandidateById.mockReset();
    listReflectionCandidatesByThread.mockReset();
    appendReflectionCandidateEvidence.mockReset();
    admitReflection.mockReset();
    getReflectionCandidateBySourceResponse.mockResolvedValue(null);
    listReflectionCandidatesByThread.mockResolvedValue([]);
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
    createReflectionCandidate.mockResolvedValue({ id: "candidate-1", threadId: "thread-1", sourceResponseId: "response-1" });

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
    expect(createReflectionCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        threadId: "thread-1",
        sourceResponseId: "response-1",
        sourceReflectiveObjectIds: ["obj-1"],
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        reflectionCandidate: expect.objectContaining({
          id: "candidate-1",
          threadId: "thread-1",
          sourceResponseId: "response-1",
        }),
      }),
    );
  });

  it("appends response evidence to the single active provisional candidate on a reused thread", async () => {
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
    listReflectionCandidatesByThread.mockResolvedValue([
      {
        id: "candidate-existing",
        threadId: "thread-existing",
        sourceResponseId: "response-1",
        state: "provisional",
      },
    ]);
    appendReflectionCandidateEvidence.mockResolvedValue({
      id: "evidence-1",
      candidateId: "candidate-existing",
      responseId: "response-2",
      openingId: "opening-1",
    });

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
    expect(listReflectionCandidatesByThread).toHaveBeenCalledWith("thread-existing", "user-a");
    expect(appendReflectionCandidateEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        candidateId: "candidate-existing",
        responseId: "response-2",
        openingId: "opening-1",
      }),
    );
    expect(createReflectionCandidate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        reflectionCandidate: expect.objectContaining({
          id: "candidate-existing",
          state: "provisional",
        }),
      }),
    );
  });

  it("admits an explicitly selected provisional candidate as a durable reflection after evidence append", async () => {
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
    createResponse.mockResolvedValue({ id: "response-4" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-4" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-4" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-4" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-4" });
    listReflectionCandidatesByThread.mockResolvedValue([
      {
        id: "candidate-existing",
        userId: "user-a",
        threadId: "thread-existing",
        sourceResponseId: "response-1",
        sourceOpeningId: "opening-1",
        sourceReflectiveObjectIds: ["obj-1"],
        state: "provisional",
      },
    ]);
    getReflectionCandidateById.mockResolvedValue({
      id: "candidate-existing",
      userId: "user-a",
      threadId: "thread-existing",
      sourceResponseId: "response-1",
      sourceOpeningId: "opening-1",
      sourceReflectiveObjectIds: ["obj-1"],
      state: "provisional",
    });
    appendReflectionCandidateEvidence.mockResolvedValue({
      id: "evidence-2",
      candidateId: "candidate-existing",
      responseId: "response-4",
      openingId: "opening-1",
    });
    admitReflection.mockResolvedValue({
      id: "reflection-1",
      userId: "user-a",
      candidateId: "candidate-existing",
      threadId: "thread-existing",
      sourceResponseId: "response-1",
      sourceOpeningId: "opening-1",
      sourceReflectiveObjectIds: ["obj-1"],
      statement: "I keep returning to the same uncertainty during transition.",
      pattern: ["Transition", "Uncertainty", "Return"],
      admittedAt: "2026-07-04T12:00:00.000Z",
      archivedAt: null,
      createdAt: "2026-07-04T12:00:00.000Z",
      updatedAt: "2026-07-04T12:00:00.000Z",
    });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Admission boundary",
          responseText: "I can now say this is the same uncertainty I return to in transitions.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
          reflectionAdmission: {
            candidateId: "candidate-existing",
            statement: "I keep returning to the same uncertainty during transition.",
            pattern: ["Transition", "Uncertainty", "Return"],
          },
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(201);
    expect(appendReflectionCandidateEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "candidate-existing",
        responseId: "response-4",
      }),
    );
    expect(getReflectionCandidateById).toHaveBeenCalledWith("candidate-existing", "user-a");
    expect(admitReflection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        candidateId: "candidate-existing",
        statement: "I keep returning to the same uncertainty during transition.",
        pattern: ["Transition", "Uncertainty", "Return"],
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        reflectionCandidate: expect.objectContaining({
          id: "candidate-existing",
        }),
        reflection: expect.objectContaining({
          id: "reflection-1",
          candidateId: "candidate-existing",
          statement: "I keep returning to the same uncertainty during transition.",
        }),
      }),
    );
  });

  it("creates a new candidate without appending evidence when multiple provisional candidates exist on the reused thread", async () => {
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
    createResponse.mockResolvedValue({ id: "response-3" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-3" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-3" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-3" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-3" });
    listReflectionCandidatesByThread.mockResolvedValue([
      {
        id: "candidate-a",
        threadId: "thread-existing",
        sourceResponseId: "response-a",
        state: "provisional",
      },
      {
        id: "candidate-b",
        threadId: "thread-existing",
        sourceResponseId: "response-b",
        state: "provisional",
      },
    ]);
    createReflectionCandidate.mockResolvedValue({
      id: "candidate-new",
      threadId: "thread-existing",
      sourceResponseId: "response-3",
      state: "provisional",
    });

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Ambiguous continuation",
          responseText: "This continues the thread but should not pick a candidate arbitrarily.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(201);
    expect(listReflectionCandidatesByThread).toHaveBeenCalledWith("thread-existing", "user-a");
    expect(appendReflectionCandidateEvidence).not.toHaveBeenCalled();
    expect(createReflectionCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        threadId: "thread-existing",
        sourceResponseId: "response-3",
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        reflectionCandidate: expect.objectContaining({
          id: "candidate-new",
          state: "provisional",
        }),
      }),
    );
  });

  it("fails explicitly when reflection candidate creation fails after response persistence", async () => {
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
    createReflectionCandidate.mockRejectedValue(new Error("candidate write failed"));

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

    expect(createResponse).toHaveBeenCalled();
    expect(createReflectionCandidate).toHaveBeenCalled();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to create reflection candidate.",
    });
  });

  it("returns an admission-specific error when atomic reflection admission fails", async () => {
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
    createResponse.mockResolvedValue({ id: "response-5" });
    createObjectAssociation.mockResolvedValue({ id: "obj-assoc-5" });
    createThreadAssociation.mockResolvedValue({ id: "response-thread-assoc-5" });
    createOpeningActivationEvent.mockResolvedValue({ id: "activation-5" });
    createOpeningResponseAssociation.mockResolvedValue({ id: "assoc-5" });
    listReflectionCandidatesByThread.mockResolvedValue([
      {
        id: "candidate-existing",
        userId: "user-a",
        threadId: "thread-existing",
        sourceResponseId: "response-1",
        sourceOpeningId: "opening-1",
        sourceReflectiveObjectIds: ["obj-1"],
        state: "provisional",
        archivedAt: null,
      },
    ]);
    getReflectionCandidateById.mockResolvedValue({
      id: "candidate-existing",
      userId: "user-a",
      threadId: "thread-existing",
      sourceResponseId: "response-1",
      sourceOpeningId: "opening-1",
      sourceReflectiveObjectIds: ["obj-1"],
      state: "provisional",
      archivedAt: null,
    });
    appendReflectionCandidateEvidence.mockResolvedValue({
      id: "evidence-5",
      candidateId: "candidate-existing",
      responseId: "response-5",
      openingId: "opening-1",
    });
    admitReflection.mockRejectedValue(new Error("rpc failed"));

    const { POST } = await import("@/app/api/openings/[id]/responses/route");
    const response = await POST(
      new Request("http://localhost/api/openings/opening-1/responses", {
        method: "POST",
        body: JSON.stringify({
          title: "Admission failure",
          responseText: "The same line is still here.",
          openingActivationContext: "continuity_revisit",
          openingResponseContext: "response_authored",
          reflectionAdmission: {
            candidateId: "candidate-existing",
            statement: "I keep returning to the same uncertainty during transition.",
            pattern: ["Transition", "Uncertainty", "Return"],
          },
        }),
      }),
      { params: Promise.resolve({ id: "opening-1" }) },
    );

    expect(response.status).toBe(500);
    expect(admitReflection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        candidateId: "candidate-existing",
      }),
    );
    await expect(response.json()).resolves.toEqual({
      error: "Failed to admit reflection.",
    });
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
