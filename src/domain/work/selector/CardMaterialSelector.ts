import { materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import type { DirectionCatalogRow } from "@/src/db/repositories/catalogRepo";
import type { TracePayload } from "@/src/domain/work/trace/TraceTypes";

export type SeedInput = { kind: "frame" | "work"; text: string };

export type MaterialCandidate = {
  type: "anchor" | "event" | "seed" | "intent";
  text_snippet: string;
  anchor_keys?: string[];
  seed_kind?: "frame" | "work";
  intent_kind?: "open_loop" | "hypothesis";
  intent_key?: string;
  intent_label?: string;
};

export type DirectionProfile = {
  slug: string | null;
  group_tags: string[];
  style_hints?: { tone?: "gentle" | "neutral" };
  question_archetypes?: string[];
};

export type Selected = {
  material: {
    type: "anchor" | "event" | "seed" | "intent";
    id: string;
    text_snippet: string;
    anchor_keys?: string[];
    intent_kind?: "open_loop" | "hypothesis";
    intent_key?: string;
    intent_label?: string;
  };
  direction: DirectionProfile;
  mode: "normal" | "gentle";
  selection_trace: TracePayload["selection"];
};

export type SelectorResult = {
  selected: Selected | null;
  selection_trace: TracePayload["selection"] | null;
  reason?: "low_novelty" | "prefs_block_all";
};

export type SessionState = {
  session_id: string;
  intents: MaterialCandidate[];
  anchors: MaterialCandidate[];
  events: MaterialCandidate[];
  recent_material_ids: string[];
  recent_prompts: string[];
  ledger_used_anchor_keys: Set<string>;
  catalog: DirectionCatalogRow[];
  direction_candidates?: string[];
  mode: "normal" | "gentle";
};

const SIMILARITY_THRESHOLD = 0.85;
const RULED_OUT_LIMIT = 8;

type ScoredCandidate = MaterialCandidate & { id: string; similarity_max: number };

function isScoredCandidate(x: unknown): x is ScoredCandidate {
  return !!x && typeof x === "object" && typeof (x as any).id === "string" && typeof (x as any).similarity_max === "number";
}

function normalizeText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  const tokens = normalizeText(s)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function similarityMax(text: string, recent: string[]): number {
  if (!text || !recent.length) return 0;
  const a = tokenSet(text);
  if (!a.size) return 0;
  let max = 0;
  for (const r of recent) {
    const sim = jaccard(a, tokenSet(r));
    if (sim > max) max = sim;
  }
  return max;
}

function materialId(candidate: MaterialCandidate): string {
  return materialHashFromPayload({
    type: candidate.type,
    text_snippet: candidate.text_snippet,
    anchor_keys: candidate.anchor_keys ?? [],
    seed_kind: candidate.seed_kind ?? null,
    intent_key: candidate.intent_key ?? null,
    intent_kind: candidate.intent_kind ?? null,
    intent_label: candidate.intent_label ?? null,
  });
}

function buildDirectionProfile(row: DirectionCatalogRow | null, mode: "normal" | "gentle"): DirectionProfile {
  if (!row) {
    return { slug: null, group_tags: [], style_hints: { tone: mode === "gentle" ? "gentle" : "neutral" } };
  }
  const toneTags = Array.isArray(row.content?.ai_contract?.tone_tags) ? row.content.ai_contract.tone_tags : [];
  const tone = toneTags.includes("gentle") || mode === "gentle" ? "gentle" : "neutral";
  const questionStyle = typeof row.content?.method_spec?.question_style === "string" ? row.content.method_spec.question_style : "";
  return {
    slug: row.slug,
    group_tags: Array.isArray((row as any).tags) ? (row as any).tags.filter((t: unknown) => typeof t === "string") : [],
    style_hints: { tone },
    question_archetypes: questionStyle ? [questionStyle] : [],
  };
}

function resolveDirectionSlug(
  catalog: DirectionCatalogRow[],
  directionSlug?: string | null,
  directionCandidates?: string[]
): DirectionCatalogRow | null {
  if (directionSlug) {
    const direct = catalog.find((row) => row.slug === directionSlug);
    if (direct) return direct;
  }

  if (directionCandidates?.length) {
    for (const slug of directionCandidates) {
      const row = catalog.find((item) => item.slug === slug);
      if (row) return row;
    }
  }

  return catalog[0] ?? null;
}

function safeSnippet(x: unknown): string {
  return typeof x === "string" ? x : "";
}

function asBaseScored(selectionBase: MaterialCandidate | ScoredCandidate | null | undefined, recentPrompts: string[]): {
  type: MaterialCandidate["type"];
  id: string;
  text_snippet: string;
  anchor_keys?: string[];
  intent_kind?: "open_loop" | "hypothesis";
  intent_key?: string;
  intent_label?: string;
  similarity_max: number;
} {
  if (!selectionBase) {
    return { type: "seed", id: "none", text_snippet: "", similarity_max: 0 };
  }

  if (isScoredCandidate(selectionBase)) {
    return {
      type: selectionBase.type,
      id: selectionBase.id,
      text_snippet: safeSnippet(selectionBase.text_snippet),
      anchor_keys: selectionBase.anchor_keys,
      intent_kind: selectionBase.intent_kind,
      intent_key: selectionBase.intent_key,
      intent_label: selectionBase.intent_label,
      similarity_max: selectionBase.similarity_max,
    };
  }

  const snippet = safeSnippet(selectionBase.text_snippet);
  return {
    type: selectionBase.type,
    id: materialId(selectionBase),
    text_snippet: snippet,
    anchor_keys: selectionBase.anchor_keys,
    intent_kind: selectionBase.intent_kind,
    intent_key: selectionBase.intent_key,
    intent_label: selectionBase.intent_label,
    similarity_max: snippet ? similarityMax(snippet, recentPrompts) : 0,
  };
}

export function selectCardMaterial(args: {
  sessionState: SessionState;
  directionSlug?: string | null;
  seed?: SeedInput | null;
  prefs?: { blocked_group_tags?: string[] } | null;
}): SelectorResult {
  const { sessionState } = args;

  const catalog = sessionState.catalog ?? [];
  const directionRow = resolveDirectionSlug(catalog, args.directionSlug ?? null, sessionState.direction_candidates);
  const profile = buildDirectionProfile(directionRow, sessionState.mode);

  const blocked = new Set((args.prefs?.blocked_group_tags ?? []).map((t) => String(t)));
  const allBlocked = profile.group_tags.length > 0 && profile.group_tags.every((tag) => blocked.has(String(tag)));

  const ruled_out: Array<{ why: string; candidate: string }> = [];
  const ledger_ruled_out: Array<{ why: string; candidate: string }> = [];
  const candidates: ScoredCandidate[] = [];
  const ledgerRepeats: ScoredCandidate[] = [];
  let intentRuledOutCount = 0;

  const seedCandidate: MaterialCandidate | null =
    args.seed && args.seed.text.trim()
      ? {
          type: "seed",
          text_snippet: args.seed.text.trim().slice(0, 320),
          seed_kind: args.seed.kind,
        }
      : null;

  const allCandidates: MaterialCandidate[] = [
    ...(seedCandidate ? [seedCandidate] : []),
    ...(sessionState.intents ?? []),
    ...(sessionState.anchors ?? []),
    ...(sessionState.events ?? []),
  ];

  const recentPrompts = sessionState.recent_prompts ?? [];

  for (const candidate of allCandidates) {
    const id = materialId(candidate);
    const snippet = candidate.text_snippet ?? "";
    const simMax = snippet ? similarityMax(snippet, recentPrompts) : 0;

    if (sessionState.recent_material_ids.includes(id)) {
      ruled_out.push({ why: "recent_material_repeat", candidate: snippet });
      if (candidate.type === "intent") intentRuledOutCount++;
      continue;
    }

    if (simMax >= SIMILARITY_THRESHOLD) {
      ruled_out.push({ why: "low_novelty", candidate: snippet });
      if (candidate.type === "intent") intentRuledOutCount++;
      continue;
    }

    if (candidate.anchor_keys?.some((k) => sessionState.ledger_used_anchor_keys.has(k))) {
      ledger_ruled_out.push({ why: "ledger_repeat", candidate: snippet });
      ledgerRepeats.push({ ...candidate, id, similarity_max: simMax });
      if (candidate.type === "intent") intentRuledOutCount++;
      continue;
    }

    candidates.push({ ...candidate, id, similarity_max: simMax });
  }

  if (candidates.length === 0 && ledgerRepeats.length > 0) {
    candidates.push(...ledgerRepeats);
  } else if (ledger_ruled_out.length > 0) {
    ruled_out.push(...ledger_ruled_out);
  }

  const intentCandidatesCount = sessionState.intents?.length ?? 0;
  const anchorCandidatesCount = sessionState.anchors?.length ?? 0;
  const eventCandidatesCount = sessionState.events?.length ?? 0;
  const seedCandidatesCount = seedCandidate ? 1 : 0;

  const hasIntentCandidate = candidates.some((candidate) => candidate.type === "intent");
  if (hasIntentCandidate) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (candidates[i].type === "anchor") candidates.splice(i, 1);
    }
  }

  // Base trace candidate:
  // - ha van valid "non-ruled-out" jelölt, vegyük azt,
  // - különben a legelső allCandidate (seed/anchor/event), vagy null.
  const selectionBase = (candidates[0] as ScoredCandidate | undefined) ?? (allCandidates[0] as MaterialCandidate | undefined) ?? null;

  const base = asBaseScored(selectionBase, recentPrompts);

  const selectionTrace: TracePayload["selection"] = {
    material_type: base.type,
    material_id: base.id,
    anchor_keys: base.anchor_keys,
    intent_key: base.intent_key,
    intent_kind: base.intent_kind,
    intent_label: base.intent_label,
    direction_slug: profile.slug ?? null,
    group_tags: profile.group_tags ?? [],
    intent_candidates_count: intentCandidatesCount,
    anchor_candidates_count: anchorCandidatesCount,
    event_candidates_count: eventCandidatesCount,
    seed_candidates_count: seedCandidatesCount,
    intent_ruled_out_count: intentRuledOutCount,
    scores: {
      similarity_max: base.similarity_max,
      novelty: base.text_snippet ? 1 - base.similarity_max : 0,
    },
    ruled_out: ruled_out.slice(0, RULED_OUT_LIMIT),
  };

  if (allBlocked) {
    return { selected: null, reason: "prefs_block_all", selection_trace: selectionTrace };
  }

  if (candidates.length === 0) {
    return { selected: null, reason: "low_novelty", selection_trace: selectionTrace };
  }

  const sorted = candidates.slice().sort((a, b) => {
    const rank = (t: string) => (t === "seed" ? 0 : t === "intent" ? 1 : t === "anchor" ? 2 : 3);
    const d = rank(a.type) - rank(b.type);
    if (d !== 0) return d;
    return a.similarity_max - b.similarity_max;
  });

  const chosen = sorted[0];

  const chosenTrace: TracePayload["selection"] = {
    ...selectionTrace,
    material_type: chosen.type,
    material_id: chosen.id,
    anchor_keys: chosen.anchor_keys,
    intent_key: chosen.intent_key,
    intent_kind: chosen.intent_kind,
    intent_label: chosen.intent_label,
    intent_candidates_count: intentCandidatesCount,
    anchor_candidates_count: anchorCandidatesCount,
    event_candidates_count: eventCandidatesCount,
    seed_candidates_count: seedCandidatesCount,
    intent_ruled_out_count: intentRuledOutCount,
    scores: {
      similarity_max: chosen.similarity_max,
      novelty: 1 - chosen.similarity_max,
    },
  };

  return {
    selected: {
      material: {
        type: chosen.type,
        id: chosen.id,
        text_snippet: chosen.text_snippet,
        anchor_keys: chosen.anchor_keys,
        intent_key: chosen.intent_key,
        intent_kind: chosen.intent_kind,
        intent_label: chosen.intent_label,
      },
      direction: profile,
      mode: sessionState.mode,
      selection_trace: chosenTrace,
    },
    selection_trace: chosenTrace,
  };
}
