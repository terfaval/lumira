import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/db/repositories/archetypeQueueRepo", () => ({
  upsertArchetypeQueueProposal: vi.fn(async () => ({ id: "q1" })),
}));

import { upsertArchetypeQueueProposal } from "@/src/db/repositories/archetypeQueueRepo";
import {
  __test_only_determinismHash,
  __test_only_enqueueArchetypeQueueProposals,
} from "@/src/orchestration/jobs/jobBuildDreamMapV0";

describe("jobBuildDreamMapV0 determinism hash", () => {
  it("changes when only session_count changes", () => {
    const base = {
      entries: [],
      entryHighlights: [],
      glossaryRecurrence: [
        {
          term_id: "t1",
          occurrence_count: 3,
          session_count: 1,
          last_seen_at: "2026-01-02T00:00:00Z",
        },
      ],
      archetypeTerms: null,
    };

    const hash1 = __test_only_determinismHash(base as any);
    const hash2 = __test_only_determinismHash({
      ...base,
      glossaryRecurrence: [
        {
          term_id: "t1",
          occurrence_count: 3,
          session_count: 2,
          last_seen_at: "2026-01-02T00:00:00Z",
        },
      ],
    } as any);

    expect(hash1).not.toBe(hash2);
  });

  it("changes when archetype alias_keys change", () => {
    const base = {
      entries: [],
      entryHighlights: [],
      glossaryRecurrence: [],
      archetypeTerms: [
        {
          id: "a1",
          user_id: "u1",
          domain: "people",
          canonical_key: "lany",
          canonical_label: "Lany",
          alias_keys: ["lanyka"],
          status: "verified",
        },
      ],
    };

    const hash1 = __test_only_determinismHash(base as any);
    const hash2 = __test_only_determinismHash({
      ...base,
      archetypeTerms: [
        {
          id: "a1",
          user_id: "u1",
          domain: "people",
          canonical_key: "lany",
          canonical_label: "Lany",
          alias_keys: ["lanyka", "lanynka"],
          status: "verified",
        },
      ],
    } as any);

    expect(hash1).not.toBe(hash2);
  });
});

describe("jobBuildDreamMapV0 canonicalizer queue", () => {
  it("enqueues proposals when present", async () => {
    const payload = {
      meta: {
        debug: {
          canonicalizer: {
            proposals_sample: [
              { domain: "people", baseKey: "Lany", label: "Lany", occurrence: 2, suggested_canonical_key: "lany" },
              { domain: "", baseKey: "Skip", label: "Skip", occurrence: 1, suggested_canonical_key: "skip" },
            ],
          },
        },
      },
    };

    await __test_only_enqueueArchetypeQueueProposals({
      supabase: {} as any,
      event: { user_id: "u1" },
      payload,
      dream_map_version_id: "dm1",
    });

    expect((upsertArchetypeQueueProposal as any).mock.calls.length).toBe(1);
    expect((upsertArchetypeQueueProposal as any).mock.calls[0]?.[1]?.base_key).toBe("Lany");
  });

  it("swallows upsert errors", async () => {
    (upsertArchetypeQueueProposal as any).mockImplementationOnce(async () => {
      throw new Error("fail");
    });

    await __test_only_enqueueArchetypeQueueProposals({
      supabase: {} as any,
      event: { user_id: "u1" },
      payload: {
        meta: {
          debug: {
            canonicalizer: { proposals_sample: [{ domain: "people", baseKey: "Lany" }] },
          },
        },
      },
      dream_map_version_id: "dm1",
    });
  });
});
