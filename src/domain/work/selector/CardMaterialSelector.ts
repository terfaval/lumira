import { materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import type { DirectionCatalogRow } from "@/src/db/repositories/catalogRepo";
import type { TracePayload } from "@/src/domain/work/trace/TraceTypes";

export type SeedInput = { kind: "frame" | "work"; text: string };

export type MaterialCandidate = {
  type: "anchor" | "event" | "seed";
  text_snippet: string;
  anchor_keys?: string[];
  seed_kind?: "frame" | "work";
};

export type DirectionProfile = {
  slug: string | null;
  group_tags: string[];
  style_hints?: { tone?: "gentle" | "neutral" };
  question_archetypes?: string[];
};

export type Selected = {
  material: {
    type: "anchor" | "event" | "seed";
    id: string;
    text_snippet: string;
    anchor_keys?: string[];
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
  });
}

function buildDirectionProfile(row: DirectionCatalogRow | null, mode: "normal" | "gentle"): DirectionProfile {
  if (!row) {
    return { slug: null, group_tags: [], style_hints: { tone: mode === "gentle" ? "gentle" : "neutral" } };
  }
  const toneTags = Array.isArray(row.content?.ai_contract?.tone_tags) ? row.content.ai_contract.tone_tags : [];
  const tone = toneTags.includes("gentle") || mode === "gentle" ? "gentle" : "neutral";
  const questionStyle =
    typeof row.content?.method_spec?.question_style === "string" ? row.content.method_spec.question_style : "";
  return {
    slug: row.slug,
    group_tags: Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === "string") : [],
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
  const allBlocked =
    profile.group_tags.length > 0 && profile.group_tags.every((tag) => blocked.has(String(tag)));

  const ruled_out: Array<{ why: string; candidate: string }> = [];
  const candidates: Array<MaterialCandidate & { id: string; similarity_max: number }> = [];

  const seedCandidate =
    args.seed && args.seed.text.trim()
      ? ({
          type: "seed",
          text_snippet: args.seed.text.trim().slice(0, 320),
          seed_kind: args.seed.kind,
        } as MaterialCandidate)
      : null;

  const allCandidates = [
    ...(seedCandidate ? [seedCandidate] : []),
    ...(sessionState.anchors ?? []),
    ...(sessionState.events ?? []),
  ];

  for (const candidate of allCandidates) {
    const id = materialId(candidate);
    const simMax = similarityMax(candidate.text_snippet, sessionState.recent_prompts ?? []);

    if (candidate.anchor_keys?.some((k) => sessionState.ledger_used_anchor_keys.has(k))) {
      ruled_out.push({ why: "ledger_repeat", candidate: candidate.text_snippet });
      continue;
    }

    if (sessionState.recent_material_ids.includes(id)) {
      ruled_out.push({ why: "recent_material_repeat", candidate: candidate.text_snippet });
      continue;
    }

    if (simMax >= SIMILARITY_THRESHOLD) {
      ruled_out.push({ why: "low_novelty", candidate: candidate.text_snippet });
      continue;
    }

    candidates.push({ ...candidate, id, similarity_max: simMax });
  }

  const selectionBase = candidates[0] ?? allCandidates[0];

  const baseSimilarity =
    selectionBase && "similarity_max" in selectionBase
      ? selectionBase.similarity_max
      : selectionBase
        ? similarityMax(selectionBase.text_snippet, sessionState.recent_prompts ?? [])
        : 0;

  const selectionTrace: TracePayload["selection"] = {
    material_type: selectionBase?.type ?? "seed",
    material_id: selectionBase ? materialId(selectionBase) : "none",
    anchor_keys: selectionBase?.anchor_keys,
    direction_slug: profile.slug ?? null,
    group_tags: profile.group_tags ?? [],
    scores: {
      similarity_max: baseSimilarity,
      novelty: selectionBase ? 1 - baseSimilarity : 0,
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
    const rank = (t: string) => (t === "seed" ? 0 : t === "anchor" ? 1 : 2);
    const d = rank(a.type) - rank(b.type);
    if (d !== 0) return d;
    return a.similarity_max - b.similarity_max;
  });

  const chosen = sorted[0];

  return {
    selected: {
      material: {
        type: chosen.type,
        id: chosen.id,
        text_snippet: chosen.text_snippet,
        anchor_keys: chosen.anchor_keys,
      },
      direction: profile,
      mode: sessionState.mode,
      selection_trace: {
        ...selectionTrace,
        material_type: chosen.type,
        material_id: chosen.id,
        anchor_keys: chosen.anchor_keys,
        scores: {
          similarity_max: chosen.similarity_max,
          novelty: 1 - chosen.similarity_max,
        },
      },
    },
    selection_trace: {
      ...selectionTrace,
      material_type: chosen.type,
      material_id: chosen.id,
      anchor_keys: chosen.anchor_keys,
      scores: {
        similarity_max: chosen.similarity_max,
        novelty: 1 - chosen.similarity_max,
      },
    },
  };
}
