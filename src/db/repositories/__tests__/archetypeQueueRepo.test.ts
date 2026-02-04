import { describe, expect, it } from "vitest";

import { normalizeBaseKey } from "@/src/domain/archetypes/normalizeBaseKey";
import { upsertArchetypeQueueProposal } from "@/src/db/repositories/archetypeQueueRepo";

function makeSupabaseStub() {
  const upserts: Array<Record<string, unknown>> = [];

  const client = {
    from(table: string) {
      if (table !== "archetype_term_queue") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        upsert(row: Record<string, unknown>) {
          upserts.push(row);
          return {
            select() {
              return {
                async single() {
                  return { data: { id: "row-1", ...row }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  return { client, upserts };
}

describe("normalizeBaseKey", () => {
  it("uses anchorKey when available", () => {
    expect(normalizeBaseKey("Az alma Ă©s a kĂ¶rte")).toBe("alma korte");
  });

  it("falls back to diacritics stripping when anchorKey is empty", () => {
    expect(normalizeBaseKey("az Ă©s a")).toBe("az es a");
  });
});

describe("upsertArchetypeQueueProposal", () => {
  it("normalizes and shapes payload deterministically", async () => {
    const { client, upserts } = makeSupabaseStub();

    const res = await upsertArchetypeQueueProposal(client as any, {
      user_id: "u1",
      domain: "people",
      base_key: "Az alma",
      canonical_label: "Alma",
      occurrence: 2,
      suggested_canonical_key: "ALMA",
      evidence_spans_sample: [{ entry_id: "e1", start: 0, end: 4 }],
      dream_map_version_id: "dm-1",
      source: "dream_map_canonicalizer",
    });

    expect(res?.id).toBe("row-1");
    expect(upserts[0]?.base_key).toBe("alma");
    expect(upserts[0]?.canonical_key).toBe("alma");
    expect(upserts[0]?.suggested_canonical_key).toBe("alma");
    expect(upserts[0]?.canonical_label).toBe("Alma");
    expect(upserts[0]?.occurrence).toBe(2);
  });

  it("returns null when base_key is empty", async () => {
    const { client, upserts } = makeSupabaseStub();

    const res = await upsertArchetypeQueueProposal(client as any, {
      user_id: "u1",
      domain: "people",
      base_key: "   ",
      canonical_label: "x",
      occurrence: 1,
      suggested_canonical_key: "x",
    });

    expect(res).toBeNull();
    expect(upserts.length).toBe(0);
  });
});
