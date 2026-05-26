import { describe, expect, it, vi } from "vitest";

import { SupabaseLatentRepository } from "@/src/infrastructure/supabase/repositories/latent-supabase-repository";

describe("SupabaseLatentRepository isolation", () => {
  it("scopes snapshot listing by user and archived visibility", async () => {
    const orderSnapshots = vi.fn().mockResolvedValue({ data: [], error: null });
    const isSnapshots = vi.fn().mockReturnValue({ order: orderSnapshots });
    const eqSnapshots = vi.fn().mockReturnValue({ is: isSnapshots });
    const selectSnapshots = vi.fn().mockReturnValue({ eq: eqSnapshots });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_snapshots") {
        return { select: selectSnapshots };
      }
      return {};
    });

    const repository = new SupabaseLatentRepository({ from } as never);
    await repository.listSnapshotsByUser("user-a");

    expect(eqSnapshots).toHaveBeenCalledWith("user_id", "user-a");
    expect(isSnapshots).toHaveBeenCalledWith("archived_at", null);
  });

  it("archives snapshots with user scope", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "latent-1",
        user_id: "user-a",
        summary: "summary",
        confidence_band: "low",
        visibility: "internal_only",
        generation_context: "context",
        source_reflective_objects: [],
        source_observations: [],
        source_glossary_terms: [],
        source_threads: [],
        source_responses: [],
        archived_at: "2026-05-24T00:00:00.000Z",
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });
    const selectSnapshots = vi.fn().mockReturnValue({ maybeSingle });
    const isSnapshots = vi.fn().mockReturnValue({ select: selectSnapshots });
    const eqSnapshots = vi.fn((column: string) => {
      if (column === "id") return { eq: eqSnapshots };
      return { is: isSnapshots };
    });
    const updateSnapshots = vi.fn().mockReturnValue({ eq: eqSnapshots });

    const orderSignals = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqSignals = vi.fn((column: string) => {
      if (column === "snapshot_id") return { eq: eqSignals };
      return { order: orderSignals };
    });
    const selectSignals = vi.fn().mockReturnValue({ eq: eqSignals });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_snapshots") return { update: updateSnapshots };
      if (table === "latent_signals" || table === "latent_suggestions") return { select: selectSignals };
      return {};
    });

    const repository = new SupabaseLatentRepository({ from } as never);
    await repository.archiveSnapshot("latent-1", "user-a");

    expect(eqSnapshots).toHaveBeenNthCalledWith(1, "id", "latent-1");
    expect(eqSnapshots).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(isSnapshots).toHaveBeenCalledWith("archived_at", null);
  });
});
