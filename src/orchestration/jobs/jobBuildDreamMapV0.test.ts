import { describe, expect, it } from "vitest";

import { __test_only_determinismHash } from "@/src/orchestration/jobs/jobBuildDreamMapV0";

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
