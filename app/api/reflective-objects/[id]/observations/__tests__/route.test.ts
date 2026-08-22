import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getById = vi.fn();
const listByReflectiveObject = vi.fn();
const create = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({
    listByReflectiveObject,
    create,
  }),
}));

describe("/api/reflective-objects/[id]/observations route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getById.mockReset();
    listByReflectiveObject.mockReset();
    create.mockReset();
  });

  it("requires reflective object ownership before listing observations", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });
    listByReflectiveObject.mockResolvedValue([]);

    const { GET } = await import("@/app/api/reflective-objects/[id]/observations/route");
    const response = await GET(new Request("http://localhost/api/reflective-objects/obj-1/observations"), {
      params: Promise.resolve({ id: "obj-1" }),
    });

    expect(response.status).toBe(200);
    expect(getById).toHaveBeenCalledWith("obj-1", "user-a");
    expect(listByReflectiveObject).toHaveBeenCalledWith({ userId: "user-a", reflectiveObjectId: "obj-1" });
  });

  it("returns 404 when reflective object is not owned by user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/reflective-objects/[id]/observations/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/observations", {
        method: "POST",
        body: JSON.stringify({ source: "system_descriptive_extract", summary: "s", fragments: [] }),
      }),
      {
        params: Promise.resolve({ id: "obj-1" }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("rejects manual legacy observation writes after authority cutover", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });

    const { POST } = await import("@/app/api/reflective-objects/[id]/observations/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/observations", {
        method: "POST",
        body: JSON.stringify({
          source: "system_descriptive_extract",
          summary: "I was in a room",
          fragments: [
            {
              category: "scene",
              fragmentText: "I was in a room",
              position: 0,
              evidence: { snippet: "I was in a room", spanStart: 0, spanEnd: 14 },
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ id: "obj-1" }),
      },
    );

    expect(response.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns compatibility rejection when interpretive legacy writes are attempted", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });

    const { POST } = await import("@/app/api/reflective-objects/[id]/observations/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/observations", {
        method: "POST",
        body: JSON.stringify({
          source: "user_descriptive_note",
          summary: "The scarecrow represents paternal fear.",
          fragments: [
            {
              category: "emotion",
              fragmentText: "I felt fear.",
              position: 0,
              evidence: { snippet: "I felt fear in the dream", spanStart: 0, spanEnd: 23 },
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ id: "obj-1" }),
      },
    );

    expect(response.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns compatibility rejection when insufficient-evidence legacy writes are attempted", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });

    const { POST } = await import("@/app/api/reflective-objects/[id]/observations/route");
    const response = await POST(
      new Request("http://localhost/api/reflective-objects/obj-1/observations", {
        method: "POST",
        body: JSON.stringify({
          source: "system_descriptive_extract",
          summary: "A similar interaction pattern appeared previously.",
          fragments: [
            {
              category: "recurrence_candidate",
              fragmentText: "again",
              position: 0,
              evidence: { snippet: "again", spanStart: null, spanEnd: null },
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ id: "obj-1" }),
      },
    );

    expect(response.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });
});
