import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSnapshotById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-latent-repository", () => ({
  createLatentRepository: () => ({
    getSnapshotById,
  }),
}));

describe("/api/latent/snapshots/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getSnapshotById.mockReset();
  });

  it("scopes latent snapshot lookup by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue({ id: "latent-1" });

    const { GET } = await import("@/app/api/latent/snapshots/[id]/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots/latent-1"), {
      params: Promise.resolve({ id: "latent-1" }),
    });

    expect(response.status).toBe(200);
    expect(getSnapshotById).toHaveBeenCalledWith("latent-1", "user-a");
  });

  it("returns 404 when snapshot is not owned by resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSnapshotById.mockResolvedValue(null);

    const { GET } = await import("@/app/api/latent/snapshots/[id]/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots/latent-1"), {
      params: Promise.resolve({ id: "latent-1" }),
    });

    expect(response.status).toBe(404);
  });
});
