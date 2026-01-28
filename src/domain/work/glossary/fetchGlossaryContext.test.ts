import { describe, expect, it } from "vitest";

import { fetchGlossaryContext } from "./fetchGlossaryContext";

type TermRow = {
  id: string;
  user_id: string;
  canonical: string;
  canonical_key: string;
  category: string | null;
};

type OccRow = {
  term_id: string;
  user_id: string;
  session_id: string;
};

type NoteRow = {
  term_id: string;
  content: string | null;
  created_at: string | null;
  do_not_surface?: boolean | null;
};

function makeSupabaseStub(params: {
  terms?: TermRow[];
  occurrences?: OccRow[];
  notes?: NoteRow[];
  notesSupportsVisibility?: boolean;
}) {
  const terms = params.terms ?? [];
  const occurrences = params.occurrences ?? [];
  const notes = params.notes ?? [];
  const notesSupportsVisibility = params.notesSupportsVisibility ?? true;

  function applyFilters<T extends Record<string, any>>(rows: T[], filters: any[]) {
    return rows.filter((row) => {
      for (const f of filters) {
        if (f.op === "eq") {
          if (row[f.col] !== f.val) return false;
        } else if (f.op === "in") {
          if (!Array.isArray(f.vals) || !f.vals.includes(row[f.col])) return false;
        }
      }
      return true;
    });
  }

  function makeQuery(table: string) {
    const state = {
      table,
      select: "",
      filters: [] as Array<{ op: "eq" | "in"; col: string; val?: any; vals?: any[] }>,
      order: null as null | { col: string; ascending: boolean },
    };

    const builder = {
      select(cols: string) {
        state.select = cols;
        return builder;
      },
      eq(col: string, val: any) {
        state.filters.push({ op: "eq", col, val });
        return builder;
      },
      in(col: string, vals: any[]) {
        state.filters.push({ op: "in", col, vals });
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        state.order = { col, ascending: opts?.ascending ?? true };
        return builder;
      },
      async _execute() {
        if (table === "glossary_notes" && state.select.includes("do_not_surface") && !notesSupportsVisibility) {
          return {
            data: null,
            error: { message: "column glossary_notes.do_not_surface does not exist" },
          };
        }

        if (table === "glossary_terms") {
          const data = applyFilters(terms, state.filters);
          return { data, error: null };
        }
        if (table === "glossary_occurrences") {
          const data = applyFilters(occurrences, state.filters);
          return { data, error: null };
        }
        if (table === "glossary_notes") {
          let data = applyFilters(notes, state.filters);
          if (state.order) {
            data = data.slice().sort((a, b) => {
              const aVal = String((a as any)[state.order!.col] ?? "");
              const bVal = String((b as any)[state.order!.col] ?? "");
              const cmp = aVal.localeCompare(bVal);
              return state.order!.ascending ? cmp : -cmp;
            });
          }
          return { data, error: null };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
      then(onFulfilled: any, onRejected: any) {
        return builder._execute().then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    client: {
      from(table: string) {
        return makeQuery(table);
      },
    },
  };
}

describe("fetchGlossaryContext", () => {
  it("returns null when no anchor keys are provided", async () => {
    const { client } = makeSupabaseStub({});
    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: [],
    });
    expect(res).toBeNull();
  });

  it("returns null when no session occurrences exist", async () => {
    const { client } = makeSupabaseStub({
      terms: [
        { id: "t1", user_id: "u1", canonical: "Kutya", canonical_key: "kutya", category: "character" },
      ],
      occurrences: [],
    });

    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: ["kutya"],
    });

    expect(res).toBeNull();
  });

  it("selects the highest-scoring term deterministically", async () => {
    const { client } = makeSupabaseStub({
      terms: [
        { id: "t1", user_id: "u1", canonical: "LĂ©pcsĹ‘hĂˇz", canonical_key: "lepcsohaz", category: "place" },
        { id: "t2", user_id: "u1", canonical: "Csomag", canonical_key: "csomag", category: "object" },
      ],
      occurrences: [
        { term_id: "t1", user_id: "u1", session_id: "s1" },
        { term_id: "t1", user_id: "u1", session_id: "s1" },
        { term_id: "t2", user_id: "u1", session_id: "s1" },
      ],
    });

    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: ["lepcsohaz", "csomag"],
    });

    expect(res?.canonical_key).toBe("lepcsohaz");
  });

  it("honors do_not_surface by stripping notes", async () => {
    const { client } = makeSupabaseStub({
      terms: [
        { id: "t1", user_id: "u1", canonical: "Anyu", canonical_key: "anyu", category: "character" },
      ],
      occurrences: [{ term_id: "t1", user_id: "u1", session_id: "s1" }],
      notes: [{ term_id: "t1", content: "SzemĂ©lyes", created_at: "2026-01-01T10:00:00Z", do_not_surface: true }],
    });

    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: ["anyu"],
    });

    expect(res?.canonical).toBe("Anyu");
    expect(res?.note).toBeNull();
  });

  it("uses category priority as a tie-breaker", async () => {
    const { client } = makeSupabaseStub({
      terms: [
        { id: "t1", user_id: "u1", canonical: "LĂˇny", canonical_key: "lany", category: "character" },
        { id: "t2", user_id: "u1", canonical: "Utca", canonical_key: "utca", category: "place" },
      ],
      occurrences: [
        { term_id: "t1", user_id: "u1", session_id: "s1" },
        { term_id: "t2", user_id: "u1", session_id: "s1" },
      ],
    });

    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: ["lany", "utca"],
    });

    expect(res?.canonical_key).toBe("lany");
  });

  it("uses note recency as a light tie-breaker", async () => {
    const { client } = makeSupabaseStub({
      terms: [
        { id: "t1", user_id: "u1", canonical: "Kulcs", canonical_key: "kulcs", category: "object" },
        { id: "t2", user_id: "u1", canonical: "Telefon", canonical_key: "telefon", category: "object" },
      ],
      occurrences: [
        { term_id: "t1", user_id: "u1", session_id: "s1" },
        { term_id: "t2", user_id: "u1", session_id: "s1" },
      ],
      notes: [
        { term_id: "t1", content: "rĂ©gi", created_at: "2024-01-01T10:00:00Z" },
        { term_id: "t2", content: "Ăşj", created_at: "2026-01-01T10:00:00Z" },
      ],
    });

    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: ["kulcs", "telefon"],
    });

    expect(res?.canonical_key).toBe("telefon");
  });

  it("falls back gracefully when do_not_surface column is missing", async () => {
    const { client } = makeSupabaseStub({
      notesSupportsVisibility: false,
      terms: [
        { id: "t1", user_id: "u1", canonical: "Lift", canonical_key: "lift", category: "object" },
      ],
      occurrences: [{ term_id: "t1", user_id: "u1", session_id: "s1" }],
      notes: [{ term_id: "t1", content: "RĂ©gi emlĂ©k", created_at: "2026-01-02T10:00:00Z" }],
    });

    const res = await fetchGlossaryContext({
      supabase: client as any,
      userId: "u1",
      sessionId: "s1",
      anchorKeys: ["lift"],
    });

    expect(res?.note).toBe("RĂ©gi emlĂ©k");
  });
});
