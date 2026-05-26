import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listSnapshotsByUser = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-latent-repository", () => ({
  createLatentRepository: () => ({
    listSnapshotsByUser,
  }),
}));

describe("/api/latent/snapshots route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listSnapshotsByUser.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/latent/snapshots/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots"));

    expect(response.status).toBe(401);
  });

  it("lists latent snapshots for resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listSnapshotsByUser.mockResolvedValue([]);

    const { GET } = await import("@/app/api/latent/snapshots/route");
    const response = await GET(new Request("http://localhost/api/latent/snapshots"));

    expect(response.status).toBe(200);
    expect(listSnapshotsByUser).toHaveBeenCalledWith("user-a");
  });
});
