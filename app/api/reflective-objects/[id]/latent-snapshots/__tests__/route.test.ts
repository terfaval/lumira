import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getById = vi.fn();
const listByReflectiveObject = vi.fn();
const listTerms = vi.fn();
const listThreadsByUser = vi.fn();
const listResponsesByReflectiveObject = vi.fn();
const listRecentOpeningsByUser = vi.fn();
const listSnapshotsByUser = vi.fn();
const createSnapshot = vi.fn();

const forbiddenMutationFns = {
  updateObject: vi.fn(),
  archiveObject: vi.fn(),
  createObservation: vi.fn(),
  updateGlossaryTerm: vi.fn(),
  setThreadState: vi.fn(),
  updateResponse: vi.fn(),
};

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
    update: forbiddenMutationFns.updateObject,
    archive: forbiddenMutationFns.archiveObject,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({
    listByReflectiveObject,
    create: forbiddenMutationFns.createObservation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-glossary-repository", () => ({
  createGlossaryRepository: () => ({
    listTerms,
    renameTerm: forbiddenMutationFns.updateGlossaryTerm,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    listThreadsByUser,
    setThreadState: forbiddenMutationFns.setThreadState,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    listResponsesByReflectiveObject,
    updateResponse: forbiddenMutationFns.updateResponse,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-opening-repository", () => ({
  createOpeningRepository: () => ({
    listRecentOpeningsByUser,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-latent-repository", () => ({
  createLatentRepository: () => ({
    listSnapshotsByUser,
    createSnapshot,
  }),
}));

describe("/api/reflective-objects/[id]/latent-snapshots route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getById.mockReset();
    listByReflectiveObject.mockReset();
    listTerms.mockReset();
    listThreadsByUser.mockReset();
    listResponsesByReflectiveObject.mockReset();
    listRecentOpeningsByUser.mockReset();
    listSnapshotsByUser.mockReset();
    createSnapshot.mockReset();
    Object.values(forbiddenMutationFns).forEach((fn) => fn.mockReset());
  });

  it("generates latent snapshot from owned context without mutating canonical domains", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    listByReflectiveObject.mockResolvedValue([]);
    listTerms.mockResolvedValue([]);
    listThreadsByUser.mockResolvedValue([]);
    listResponsesByReflectiveObject.mockResolvedValue([]);
    listRecentOpeningsByUser.mockResolvedValue([]);
    listSnapshotsByUser.mockResolvedValue([]);
    createSnapshot.mockResolvedValue({ id: "latent-1", suggestions: [] });

    const { POST } = await import("@/app/api/reflective-objects/[id]/latent-snapshots/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/latent-snapshots", { method: "POST" }),
      { params: Promise.resolve({ id: "obj-1" }) },
    );

    expect(response.status).toBe(201);
    expect(createSnapshot).toHaveBeenCalledTimes(1);
    expect(listByReflectiveObject).toHaveBeenCalledWith({
      userId: "user-a",
      reflectiveObjectId: "obj-1",
      limit: 24,
    });
    expect(listResponsesByReflectiveObject).toHaveBeenCalledWith("user-a", "obj-1", 80);

    expect(forbiddenMutationFns.updateObject).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.archiveObject).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.createObservation).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.updateGlossaryTerm).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.setThreadState).not.toHaveBeenCalled();
    expect(forbiddenMutationFns.updateResponse).not.toHaveBeenCalled();
  });

  it("returns 404 when reflective object is not owned by user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/reflective-objects/[id]/latent-snapshots/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/latent-snapshots", { method: "POST" }),
      { params: Promise.resolve({ id: "obj-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
