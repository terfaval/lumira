import { describe, expect, it, vi } from "vitest";

import { SupabaseOpeningRepository } from "@/src/infrastructure/supabase/repositories/opening-supabase-repository";

describe("SupabaseOpeningRepository isolation", () => {
  it("scopes opening surface list by user and archived visibility", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ is });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseOpeningRepository({ from } as never);
    await repository.listOpeningSurfacesByUser("user-a");

    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(limit).toHaveBeenCalledWith(3);
  });

  it("loads recent openings with user scope and caller-provided limit", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ is });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseOpeningRepository({ from } as never);
    await repository.listRecentOpeningsByUser("user-a", 8);

    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(limit).toHaveBeenCalledWith(8);
  });

  it("loads dormant suppressed openings for revisit management", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const is = vi.fn().mockReturnValue({ order });
    const neqRevisit = vi.fn().mockReturnValue({ is });
    const eqSuppression = vi.fn().mockReturnValue({ neq: neqRevisit });
    const eqUser = vi.fn().mockReturnValue({ eq: eqSuppression });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseOpeningRepository({ from } as never);
    await repository.listDormantSuppressedOpeningsByUser("user-a");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-a");
    expect(eqSuppression).toHaveBeenCalledWith("suppression_state", "suppressed");
    expect(neqRevisit).toHaveBeenCalledWith("suppression_revisit_eligibility", "hidden");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("activates opening with user scope and records event", async () => {
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "evt-1",
        user_id: "user-a",
        opening_id: "opening-1",
        event_type: "activated",
        source: "reflective_space_surface",
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });
    const eventSelect = vi.fn().mockReturnValue({ single: eventSingle });
    const eventInsert = vi.fn().mockReturnValue({ select: eventSelect });

    const openingMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "opening-1",
        user_id: "user-a",
        opening_type: "continuity_noticing",
        tone: "gentle",
        utterance: "This may connect nearby.",
        state: "activated",
        visibility: "opened",
        suppression_state: "none",
        suppression_duration: null,
        suppression_reason: null,
        suppression_expires_at: null,
        suppression_revisit_eligibility: "revisitable_dormant",
        suppression_reactivated_at: null,
        latent_snapshot_id: "latent-1",
        source_objects: ["obj-1"],
        source_observations: ["obs-1"],
        source_glossary_terms: [],
        source_threads: [],
        source_responses: [],
        confidence_band: "tentative",
        opening_generation_context: "phase7_opening_scaffold",
        activated_at: "2026-05-24T00:00:00.000Z",
        dismissed_at: null,
        archived_at: null,
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });

    const openingSelect = vi.fn().mockReturnValue({ maybeSingle: openingMaybeSingle });
    const openingIs = vi.fn().mockReturnValue({ select: openingSelect });
    const openingEq = vi.fn((column: string) => {
      if (column === "id") return { eq: openingEq };
      if (column === "user_id") return { eq: openingEq };
      return { is: openingIs };
    });
    const openingUpdate = vi.fn().mockReturnValue({ eq: openingEq });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "openings") {
        return { update: openingUpdate };
      }
      if (table === "opening_surface_events") {
        return { insert: eventInsert };
      }
      return {};
    });

    const repository = new SupabaseOpeningRepository({ from } as never);
    const opening = await repository.activateOpening({
      openingId: "opening-1",
      userId: "user-a",
      source: "reflective_space_surface",
    });

    expect(opening?.id).toBe("opening-1");
    expect(openingEq).toHaveBeenNthCalledWith(1, "id", "opening-1");
    expect(openingEq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(eventInsert).toHaveBeenCalledTimes(1);
  });

  it("reactivates opening through explicit user revisit source", async () => {
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "evt-1",
        user_id: "user-a",
        opening_id: "opening-1",
        event_type: "reactivated",
        source: "manual_revisit",
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });
    const eventSelect = vi.fn().mockReturnValue({ single: eventSingle });
    const eventInsert = vi.fn().mockReturnValue({ select: eventSelect });

    const openingMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "opening-1",
        user_id: "user-a",
        opening_type: "continuity_noticing",
        tone: "gentle",
        utterance: "This may connect nearby.",
        state: "available",
        visibility: "invitation_surface",
        suppression_state: "none",
        suppression_duration: "user_reactivated",
        suppression_reason: null,
        suppression_expires_at: null,
        suppression_revisit_eligibility: "user_reactivated",
        suppression_reactivated_at: "2026-05-24T00:00:00.000Z",
        latent_snapshot_id: "latent-1",
        source_objects: ["obj-1"],
        source_observations: ["obs-1"],
        source_glossary_terms: [],
        source_threads: [],
        source_responses: [],
        confidence_band: "tentative",
        opening_generation_context: "phase7_opening_scaffold",
        activated_at: null,
        dismissed_at: null,
        archived_at: null,
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });

    const select = vi.fn().mockReturnValue({ maybeSingle: openingMaybeSingle });
    const is = vi.fn().mockReturnValue({ select });
    const eq = vi.fn((column: string) => {
      if (column === "id") return { eq };
      return { is };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const upsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "openings") return { update };
      if (table === "opening_suppressions") return { upsert };
      if (table === "opening_surface_events") return { insert: eventInsert };
      return {};
    });

    const repository = new SupabaseOpeningRepository({ from } as never);
    const opening = await repository.reactivateOpening({
      openingId: "opening-1",
      userId: "user-a",
      source: "manual_revisit",
    });

    expect(opening?.suppressionDuration).toBe("user_reactivated");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(eventInsert).toHaveBeenCalledTimes(1);
  });
});
