import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getMembershipByUserId = vi.fn();
const readdir = vi.fn();
const readFile = vi.fn();
const writeFile = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-admin-repository", () => ({
  createAdminRepository: () => ({
    getMembershipByUserId,
  }),
}));

vi.mock("node:fs/promises", () => ({
  readdir,
  readFile,
  writeFile,
}));

describe("/api/admin/meditations/reader-save route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getMembershipByUserId.mockReset();
    readdir.mockReset();
    readFile.mockReset();
    writeFile.mockReset();
  });

  it("returns 401 when user identity is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { POST } = await import("@/app/api/admin/meditations/reader-save/route");
    const response = await POST(
      new Request("http://localhost/api/admin/meditations/reader-save", {
        method: "POST",
        body: JSON.stringify({ id: "meditation-1", blocks: [] }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when authenticated user is not admin", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getMembershipByUserId.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/meditations/reader-save/route");
    const response = await POST(
      new Request("http://localhost/api/admin/meditations/reader-save", {
        method: "POST",
        body: JSON.stringify({ id: "meditation-1", blocks: [] }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 when payload is invalid", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getMembershipByUserId.mockResolvedValue({ userId: "user-a", role: "admin" });

    const { POST } = await import("@/app/api/admin/meditations/reader-save/route");
    const response = await POST(
      new Request("http://localhost/api/admin/meditations/reader-save", {
        method: "POST",
        body: JSON.stringify({ id: "", blocks: "nope" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
  });

  it("writes updated reader blocks into the matching meditation file", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getMembershipByUserId.mockResolvedValue({ userId: "user-a", role: "admin" });
    readdir.mockResolvedValue(["meditation-1.json"]);
    readFile.mockResolvedValue(
      JSON.stringify({
        id: "meditation-1",
        title: "Meditation",
        reader: {
          autoplay: true,
          end_behavior: "soft_end",
          blocks: [{ type: "text", content: "old", tone: "soft" }],
        },
      }),
    );

    const nextBlocks = [
      { type: "text", content: "new", tone: "soft" },
      { type: "pause", duration_ms: 1200 },
    ];

    const { POST } = await import("@/app/api/admin/meditations/reader-save/route");
    const response = await POST(
      new Request("http://localhost/api/admin/meditations/reader-save", {
        method: "POST",
        body: JSON.stringify({ id: "meditation-1", blocks: nextBlocks }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [, savedJson] = writeFile.mock.calls[0] as [string, string];
    expect(JSON.parse(savedJson)).toMatchObject({
      id: "meditation-1",
      reader: {
        blocks: nextBlocks,
      },
    });
  });
});
