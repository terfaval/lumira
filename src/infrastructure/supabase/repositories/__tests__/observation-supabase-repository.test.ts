import { describe, expect, it, vi } from "vitest";

import { SupabaseObservationRepository } from "@/src/infrastructure/supabase/repositories/observation-supabase-repository";

describe("SupabaseObservationRepository isolation", () => {
  it("blocks persistence when semantic policy is reject/defer", async () => {
    const repository = new SupabaseObservationRepository({ from: vi.fn() } as never);

    await expect(
      repository.create({
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        source: "user_descriptive_note",
        summary: "The scarecrow represents paternal fear.",
        uncertaintyNotes: [],
        provenanceTier: "manual_user",
        semanticPolicyResult: "reject_interpretive",
        semanticPolicyReasons: ["interpretive_or_authoritative_language_detected"],
        summaryTrace: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_semantic_guardrails_v1",
        fragments: [
          {
            category: "emotion",
            fragmentText: "I felt fear.",
            position: 0,
            evidenceAdequacy: "strong_span",
            evidence: { snippet: "I felt fear", spanStart: 0, spanEnd: 10, contextLabel: "raw_sentence" },
          },
        ],
      }),
    ).rejects.toThrow("Observation semantic policy does not allow durable persistence");
  });

  it("scopes list by user and reflective object", async () => {
    const orderObs = vi.fn().mockResolvedValue({ data: [], error: null });
    const isObs = vi.fn().mockReturnValue({ order: orderObs });
    const eqObs = vi.fn((column: string) => {
      if (column === "user_id") return { eq: eqObs };
      if (column === "reflective_object_id") return { is: isObs };
      return { is: isObs };
    });
    const selectObs = vi.fn().mockReturnValue({ eq: eqObs });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "observations") {
        return { select: selectObs };
      }

      return {};
    });

    const repository = new SupabaseObservationRepository({ from } as never);

    await repository.listByReflectiveObject({ userId: "user-a", reflectiveObjectId: "obj-1" });

    expect(eqObs).toHaveBeenNthCalledWith(1, "user_id", "user-a");
    expect(eqObs).toHaveBeenNthCalledWith(2, "reflective_object_id", "obj-1");
    expect(isObs).toHaveBeenCalledWith("archived_at", null);
  });

  it("scopes getById by observation id and user id", async () => {
    const orderFrag = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqFrag = vi.fn((column: string) => {
      if (column === "observation_id") return { eq: eqFrag };
      return { order: orderFrag };
    });
    const selectFrag = vi.fn().mockReturnValue({ eq: eqFrag });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "obs-1",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        source: "system_descriptive_extract",
        summary: "summary",
        uncertainty_notes: [],
        provenance_tier: "system_extract",
        semantic_policy_result: "accept",
        semantic_policy_reasons: [],
        summary_trace: [],
        latent_backflow_guard: "observation_only",
        boundary_version: "observation_semantic_guardrails_v1",
        state: "active",
        archived_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    const isObs = vi.fn().mockReturnValue({ maybeSingle });
    const eqObs = vi.fn((column: string) => {
      if (column === "id") return { eq: eqObs };
      return { is: isObs };
    });
    const selectObs = vi.fn().mockReturnValue({ eq: eqObs });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "observations") {
        return { select: selectObs };
      }

      if (table === "observation_fragments") {
        return { select: selectFrag };
      }

      return {};
    });

    const repository = new SupabaseObservationRepository({ from } as never);

    await repository.getById("obs-1", "user-a");

    expect(eqObs).toHaveBeenNthCalledWith(1, "id", "obs-1");
    expect(eqObs).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(eqFrag).toHaveBeenNthCalledWith(1, "observation_id", "obs-1");
    expect(eqFrag).toHaveBeenNthCalledWith(2, "user_id", "user-a");
  });
});
