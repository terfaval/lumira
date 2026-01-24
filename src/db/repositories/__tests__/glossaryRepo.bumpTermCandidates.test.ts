import { describe, expect, it } from "vitest";

import { bumpTermCandidates } from "../glossaryRepo";

type TermCandidateRow = {
  user_id: string;
  term: string;
  count?: number | null;
  display_label?: string | null;
};

function makeSupabaseStub(existingRows: TermCandidateRow[]) {
  const upserts: Array<Record<string, unknown>> = [];

  const client = {
    from(table: string) {
      if (table !== "term_candidates") {
        throw new Error(`Unexpected table: ${table}`);
      }

      let userIdFilter: string | undefined;

      return {
        select() {
          return {
            eq(_col: string, value: string) {
              userIdFilter = value;
              return {
                async in(_col2: string, terms: string[]) {
                  const data = existingRows.filter((row) => {
                    if (userIdFilter && row.user_id !== userIdFilter) return false;
                    return terms.includes(row.term);
                  });
                  return { data, error: null };
                },
              };
            },
          };
        },
        async upsert(rows: Array<Record<string, unknown>>) {
          upserts.push(...rows);
          return { error: null };
        },
      };
    },
  };

  return { client, upserts };
}

describe("bumpTermCandidates display_label selection", () => {
  it("prefers existing DB display_label over incoming", async () => {
    const { client, upserts } = makeSupabaseStub([
      { user_id: "u1", term: "x", count: 2, display_label: "Régi" },
    ]);

    await bumpTermCandidates(client as any, {
      user_id: "u1",
      terms: ["x"],
      nowISO: "2026-01-24T12:00:00.000Z",
      displayLabels: { x: "Új" },
    });

    expect(upserts[0]?.display_label).toBe("Régi");
  });

  it("falls back to incoming display_label when DB label is missing", async () => {
    const { client, upserts } = makeSupabaseStub([
      { user_id: "u1", term: "x", count: 2, display_label: null },
    ]);

    await bumpTermCandidates(client as any, {
      user_id: "u1",
      terms: ["x"],
      nowISO: "2026-01-24T12:00:00.000Z",
      displayLabels: { x: "Új" },
    });

    expect(upserts[0]?.display_label).toBe("Új");
  });

  it("falls back to term when both DB and incoming labels are missing", async () => {
    const { client, upserts } = makeSupabaseStub([
      { user_id: "u1", term: "x", count: 2, display_label: null },
    ]);

    await bumpTermCandidates(client as any, {
      user_id: "u1",
      terms: ["x"],
      nowISO: "2026-01-24T12:00:00.000Z",
    });

    expect(upserts[0]?.display_label).toBe("x");
  });

  it("does not override an existing DB label across multiple bumps", async () => {
    const { client, upserts } = makeSupabaseStub([
      { user_id: "u1", term: "x", count: 2, display_label: "Régi" },
    ]);

    await bumpTermCandidates(client as any, {
      user_id: "u1",
      terms: ["x"],
      nowISO: "2026-01-24T12:00:00.000Z",
      displayLabels: { x: "Új" },
    });

    await bumpTermCandidates(client as any, {
      user_id: "u1",
      terms: ["x"],
      nowISO: "2026-01-24T12:00:01.000Z",
      displayLabels: { x: "Még újabb" },
    });

    expect(upserts[0]?.display_label).toBe("Régi");
    expect(upserts[1]?.display_label).toBe("Régi");
  });
});
