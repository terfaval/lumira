export type GlossaryContext = {
  canonical: string;
  canonical_key: string;
  category: string | null;
  note: string | null;
  do_not_surface?: boolean | null;
};

export type GlossaryTermRow = {
  id: string;
  canonical: string;
  canonical_key: string;
  category: string | null;
};

type GlossaryOccurrenceRow = { term_id: string };

type GlossaryNoteRow = {
  term_id: string;
  content: string | null;
  created_at: string | null;
  do_not_surface?: boolean | null;
};

type NoteMeta = {
  content: string | null;
  created_at: string | null;
  do_not_surface?: boolean | null;
};

type PickBestGlossaryTermArgs = {
  terms: GlossaryTermRow[];
  occurrences: GlossaryOccurrenceRow[];
  anchorKeys: string[];
  notes?: GlossaryNoteRow[];
};

const CATEGORY_WEIGHT: Record<string, number> = {
  character: 5,
  place: 4,
  object: 3,
  beat: 2,
  felt_word: 1,
};

function normalizeKeys(keys: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys ?? []) {
    if (typeof raw !== "string") continue;
    const k = raw.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function categoryWeight(category: string | null): number {
  return category ? (CATEGORY_WEIGHT[category] ?? 0) : 0;
}

function noteMetaByTerm(notes: GlossaryNoteRow[] | undefined): Map<string, NoteMeta> {
  const map = new Map<string, NoteMeta>();
  if (!Array.isArray(notes)) return map;

  for (const row of notes) {
    const termId = row?.term_id;
    if (!termId || map.has(termId)) continue;
    const content = typeof row?.content === "string" ? row.content.trim() : "";
    const created_at = typeof row?.created_at === "string" ? row.created_at : null;
    map.set(termId, {
      content: content || null,
      created_at,
      do_not_surface: row?.do_not_surface ?? null,
    });
  }

  return map;
}

function scoreTerm(args: {
  term: GlossaryTermRow;
  matchedKey: boolean;
  hasNote: boolean;
  noteCreatedAt?: string | null;
  occCount: number;
}): number {
  const recencyTs = args.noteCreatedAt ? Date.parse(args.noteCreatedAt) : 0;
  const recencyScore = Number.isFinite(recencyTs) ? Math.min(recencyTs / 1e12, 10) : 0;

  return (
    (args.matchedKey ? 100 : 0) +
    categoryWeight(args.term.category) * 10 +
    Math.min(args.occCount, 5) * 6 +
    (args.hasNote ? 15 : 0) +
    recencyScore
  );
}

function compareTie(a: GlossaryTermRow, b: GlossaryTermRow): number {
  const aKey = (a.canonical_key ?? a.id ?? "").toString();
  const bKey = (b.canonical_key ?? b.id ?? "").toString();
  if (aKey !== bKey) return aKey.localeCompare(bKey, "hu");
  return String(a.id ?? "").localeCompare(String(b.id ?? ""), "hu");
}

export function pickBestGlossaryTerm(args: PickBestGlossaryTermArgs): {
  term: GlossaryTermRow;
  note: NoteMeta | null;
  score: number;
} | null {
  const keys = new Set(normalizeKeys(args.anchorKeys));
  if (!keys.size) return null;

  const occCounts = new Map<string, number>();
  for (const row of args.occurrences ?? []) {
    const id = row?.term_id;
    if (!id) continue;
    occCounts.set(id, (occCounts.get(id) ?? 0) + 1);
  }

  const notesById = noteMetaByTerm(args.notes);

  let best: GlossaryTermRow | null = null;
  let bestNote: NoteMeta | null = null;
  let bestScore = -1;

  for (const term of args.terms ?? []) {
    const occCount = occCounts.get(term.id) ?? 0;
    if (occCount <= 0) continue; // hard gate

    const meta = notesById.get(term.id) ?? null;
    const hasNote = Boolean(meta?.content && meta.content.trim());
    const score = scoreTerm({
      term,
      matchedKey: keys.has(term.canonical_key),
      hasNote,
      noteCreatedAt: meta?.created_at ?? null,
      occCount,
    });

    if (score > bestScore) {
      bestScore = score;
      best = term;
      bestNote = meta;
      continue;
    }

    if (score === bestScore && best && compareTie(term, best) < 0) {
      best = term;
      bestNote = meta;
    }
  }

  if (!best) return null;
  return { term: best, note: bestNote, score: bestScore };
}

function isMissingColumnError(error: unknown, column: string): boolean {
  const msg = String((error as any)?.message ?? "").toLowerCase();
  return msg.includes("column") && msg.includes(column.toLowerCase());
}

export async function fetchGlossaryContext(args: {
  supabase: any;
  userId: string;
  sessionId: string;
  anchorKeys: string[];
}): Promise<GlossaryContext | null> {
  const keys = normalizeKeys(args.anchorKeys);
  if (keys.length === 0) return null;

  const { data: terms, error: termsErr } = await args.supabase
    .from("glossary_terms")
    .select("id, canonical, canonical_key, category")
    .eq("user_id", args.userId)
    .in("canonical_key", keys);

  if (termsErr || !Array.isArray(terms) || terms.length === 0) return null;

  const termIds = terms.map((t: any) => t?.id).filter(Boolean);
  if (termIds.length === 0) return null;

  const { data: occ, error: occErr } = await args.supabase
    .from("glossary_occurrences")
    .select("term_id")
    .eq("user_id", args.userId)
    .eq("session_id", args.sessionId)
    .in("term_id", termIds);

  if (occErr || !Array.isArray(occ) || occ.length === 0) return null;

  let notesRes = await args.supabase
    .from("glossary_notes")
    .select("term_id, content, created_at, do_not_surface")
    .in("term_id", termIds)
    .order("created_at", { ascending: false });

  if (notesRes.error && isMissingColumnError(notesRes.error, "do_not_surface")) {
    notesRes = await args.supabase
      .from("glossary_notes")
      .select("term_id, content, created_at")
      .in("term_id", termIds)
      .order("created_at", { ascending: false });
  }

  const notes = Array.isArray(notesRes.data) ? (notesRes.data as GlossaryNoteRow[]) : [];

  const picked = pickBestGlossaryTerm({
    terms: terms as GlossaryTermRow[],
    occurrences: occ as GlossaryOccurrenceRow[],
    anchorKeys: keys,
    notes,
  });

  if (!picked) return null;

  const canonical = typeof picked.term.canonical === "string" ? picked.term.canonical.trim() : "";
  const canonical_key = typeof picked.term.canonical_key === "string" ? picked.term.canonical_key.trim() : "";
  if (!canonical || !canonical_key) return null;

  const do_not_surface = picked.note?.do_not_surface ?? null;
  const rawNote = typeof picked.note?.content === "string" ? picked.note.content.trim() : "";

  return {
    canonical,
    canonical_key,
    category: typeof picked.term.category === "string" ? picked.term.category : null,
    note: do_not_surface ? null : rawNote || null,
    do_not_surface,
  };
}
