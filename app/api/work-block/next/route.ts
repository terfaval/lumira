import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { fetchDirectionCatalog } from "@/src/db/repositories/catalogRepo";
import {
  fetchAnchorLatestWithPayloadAndId,
  fetchLatestRawDreamEntry,
  fetchLatentPayloadLatest,
  fetchObservationLatestDreamWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { ensureAnchorsRanked } from "@/src/orchestration/ensureAnchorsRanked";
import { recommendDirectionsFromLatent } from "@/src/domain/directions/recommendDirectionsFromLatent";
import { selectCardMaterial, SIMILARITY_THRESHOLD } from "@/src/domain/work/selector/CardMaterialSelector";
import { COMPOSE_MAX_ATTEMPTS, composeCard } from "@/src/domain/work/composer/CardComposer";
import { evaluateSafety } from "@/src/domain/work/safety/SafetyGate";
import { buildStopSignal } from "@/src/domain/work/stop/StopEngine";
import { buildLatentIntentCandidates } from "@/src/domain/work/materials/latentIntent";
import type { TraceDebugPayload, TracePayload } from "@/src/domain/work/trace/TraceTypes";
import { fetchGlossaryContext, type GlossaryContext } from "@/src/domain/work/glossary/fetchGlossaryContext";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { shouldKeepAnchorKey, shouldKeepAnchorLabel } from "@/src/lib/dream/huAnchorHygiene";
import { isDirectionCardContent } from "@/src/lib/types";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { listRecentAnchorKeys, listRecentQuestionHashes } from "@/src/db/repositories/workQuestionLedgerRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function warnCoreFlowContract(issue: string, details: Record<string, unknown>) {
  console.warn("[core-flow-contract]", { stage: "work.next", issue, ...details });
}

type NextRequest = {
  session_id?: string;
  direction_slug?: string | null;
  seed?: { kind: "frame" | "work"; text: string } | null;
  prefs?: { blocked_group_tags?: string[] } | null;
  client_request_id?: string | null;
};

type NextResponsePayload = {
  request_id: string;
  status: "ok" | "stop";
  debug?: TraceDebugPayload;
  work_block?: {
    id: string;
    direction_slug: string | null;
    group_tags: string[];
    lead_in: string;
    prompt: string;
    mode: "normal" | "gentle";
    trace: TracePayload;
  };
  stop_signal?: {
    suggest_stop: true;
    reason_code: "low_novelty" | "prefs_block_all" | "safety_limit" | "model_failure";
    message: string;
    suggested_actions: Array<"switch_direction" | "continue_later" | "free_journal">;
    trace: TracePayload;
  };
};

type ObservationItem = { label?: string; evidence?: string[] };

const RECENT_BLOCKS = 12;

function sanitizeText(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

function clampText(input: string, limit = 320): string {
  const t = sanitizeText(input);
  return t.length > limit ? t.slice(0, limit) : t;
}

function labelsFromList(list: unknown): ObservationItem[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (item && typeof item === "object" ? (item as ObservationItem) : null))
    .filter(Boolean) as ObservationItem[];
}

function toSnippet(item: ObservationItem): string {
  const evidence = Array.isArray(item.evidence) ? item.evidence.filter((e) => typeof e === "string") : [];
  return clampText(evidence[0] ?? item.label ?? "");
}

function extractMaterialsFromObservation(payload: any) {
  const anchors: Array<{ type: "anchor"; text_snippet: string; anchor_keys: string[] }> = [];
  const events: Array<{ type: "event"; text_snippet: string }> = [];

  if (!payload || typeof payload !== "object") return { anchors, events };

  const entities = payload.entities ?? {};
  const lists = [
    ...labelsFromList(entities.characters),
    ...labelsFromList(entities.places),
    ...labelsFromList(entities.objects),
    ...labelsFromList(entities.other),
    ...labelsFromList(payload.motifs),
    ...labelsFromList(payload.tone),
    ...labelsFromList(payload.structure),
    ...labelsFromList(payload.body),
  ];

  for (const item of lists) {
    const label = typeof item.label === "string" ? item.label : "";
    if (!shouldKeepAnchorLabel(label)) continue;
    const key = anchorKey(label);
    if (!shouldKeepAnchorKey(key)) continue;
    if (!key) continue;
    const snippet = toSnippet(item);
    const text_snippet = shouldKeepAnchorLabel(snippet) ? snippet : label;
    anchors.push({
      type: "anchor",
      text_snippet,
      anchor_keys: [key],
    });
  }

  const beats = labelsFromList(payload.beats);
  for (const beat of beats) {
    const snippet = toSnippet(beat);
    if (!snippet) continue;
    events.push({ type: "event", text_snippet: snippet });
  }

  return { anchors, events };
}

function extractAnchorsFromRanking(payload: any) {
  const anchors: Array<{ type: "anchor"; text_snippet: string; anchor_keys: string[] }> = [];
  if (!payload || typeof payload !== "object") return anchors;

  const topKeys = Array.isArray(payload.top_keys) ? payload.top_keys : [];
  const byKey = new Map<string, string>();
  if (Array.isArray(payload.anchors)) {
    for (const item of payload.anchors) {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      if (!name) continue;
      const key = anchorKey(name);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, name);
    }
  }

  for (const key of topKeys) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (!shouldKeepAnchorKey(key)) continue;
    const name = byKey.get(key) ?? key;
    if (!shouldKeepAnchorLabel(name)) continue;
    anchors.push({ type: "anchor", text_snippet: name, anchor_keys: [key] });
  }

  return anchors;
}

function normalizeIntentHint(input: unknown, limit = 80): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/\s+/g, " ").replace(/[?]+/g, "").trim();
  if (!cleaned) return null;
  return cleaned.length > limit ? cleaned.slice(0, limit) : cleaned;
}

function extractIntentHint(latentPayload: any): string | null {
  if (!latentPayload || typeof latentPayload !== "object") return null;

  const openLoops = Array.isArray(latentPayload.open_loops) ? latentPayload.open_loops : [];
  for (const loop of openLoops) {
    const slot = normalizeIntentHint(loop?.slot);
    if (slot) return slot;
  }

  const hypotheses = Array.isArray(latentPayload.hypothesis_slots) ? latentPayload.hypothesis_slots : [];
  if (hypotheses.length > 0) {
    const confRank: Record<string, number> = { low: 1, med: 2, high: 3 };
    let best: any = null;
    let bestScore = -1;
    for (const hyp of hypotheses) {
      const score = confRank[hyp?.confidence] ?? 0;
      if (score > bestScore) {
        bestScore = score;
        best = hyp;
      }
    }
    const slot = normalizeIntentHint(best?.slot) ?? normalizeIntentHint(best?.framing);
    if (slot) return slot;
  }

  const candidates = Array.isArray(latentPayload.direction_candidates) ? latentPayload.direction_candidates : [];
  if (candidates.length > 0) {
    let best: any = candidates[0];
    let bestScore = typeof best?.score === "number" ? best.score : -1;
    for (const cand of candidates) {
      const score = typeof cand?.score === "number" ? cand.score : -1;
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    const why = normalizeIntentHint(best?.why);
    if (why) return why;
    const slug = typeof best?.slug === "string" ? best.slug.replace(/[_-]+/g, " ").trim() : "";
    const slugHint = normalizeIntentHint(slug);
    if (slugHint) return slugHint;
  }

  return null;
}

function latentPayloadType(raw: unknown): "object" | "string" | "null" {
  if (typeof raw === "string") return "string";
  if (raw && typeof raw === "object") return "object";
  return "null";
}

function buildRequestTrace(args: {
  request_id: string;
  client_request_id?: string | null;
  session_id: string;
  direction_slug?: string | null;
  seed_kind?: "frame" | "work" | null;
  prefs_blocked_group_tags?: string[];
}): Pick<TracePayload, "request" | "inputs"> {
  return {
    request: {
      request_id: args.request_id,
      client_request_id: args.client_request_id ?? null,
      ts: new Date().toISOString(),
    },
    inputs: {
      session_id: args.session_id,
      direction_slug: args.direction_slug ?? null,
      seed_kind: args.seed_kind ?? null,
      prefs_blocked_group_tags: args.prefs_blocked_group_tags ?? [],
    },
  };
}

function buildFallbackSelectionTrace(args: {
  direction_slug?: string | null;
  group_tags?: string[];
}): TracePayload["selection"] {
  return {
    material_type: "seed",
    material_id: "none",
    direction_slug: args.direction_slug ?? null,
    group_tags: args.group_tags ?? [],
    scores: { novelty: 0, similarity_max: 0 },
    ruled_out: [],
  };
}

function sanitizeFallbackSnippet(input: string): string {
  return (input ?? "")
    .replace(/[?.!;:,"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackCompose(args: { selected: ReturnType<typeof selectCardMaterial>["selected"] }): {
  lead_in: string;
  prompt: string;
  direction_slug: string | null;
  group_tags: string[];
  compose_trace: Partial<TracePayload["model"]>;
} {
  const selected = args.selected;
  const snippet = sanitizeFallbackSnippet(selected?.material?.text_snippet ?? "");
  const safeSnippet = snippet || "ez a részlet";

  // Alap, non-interpretív, egy mondatos kérdések (1 db '?', nincs "jelentés")
  let prompt = "Mi az az egyetlen konkrét részlet, amire most rá tudsz nézni ebből?";
  if (selected?.material?.type === "anchor") {
    prompt = `Mi az első, ami feltűnik neked ebben: ${safeSnippet}?`;
  } else if (selected?.material?.type === "event") {
    prompt = `Mi a legkonkrétabb mozzanat ebben a részben: ${safeSnippet}?`;
  } else if (selected?.material?.type === "intent") {
    prompt = `Melyik részét szeretnéd most közelebbről megnézni ebből?`;
  }

  return {
    lead_in: "Röviden megállunk ennél a résznél. Csak megfigyelünk egy apró részletet.",
    prompt,
    direction_slug: selected?.direction?.slug ?? null,
    group_tags: selected?.direction?.group_tags ?? [],
    compose_trace: {
      name: "composer_fallback",
      temperature: 0,
      retries: COMPOSE_MAX_ATTEMPTS - 1,
      parse_fail: true,
    },
  };
}

async function isFirstQuestion(supabase: any, sessionId: string, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("work_versions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (error) return false;
  return (count ?? 0) === 0;
}

async function upsertWorkLatest(supabase: any, session_id: string, user_id: string, work_version_id: string) {
  const { error } = await supabase
    .from("work_latest")
    .upsert(
      {
        session_id,
        user_id,
        work_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

  if (error) throw error;
}

async function fetchRecentBlocks(supabase: any, sessionId: string, userId: string) {
  const { data } = await supabase
    .from("work_versions")
    .select("id,payload,created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RECENT_BLOCKS);

  return data ?? [];
}

async function fetchLatestAnswerText(supabase: any, sessionId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("dream_answers")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  const t = typeof data?.content === "string" ? data.content.trim() : "";
  if (!t && data) {
    console.warn("work-block/next: latest dream_answers row has empty content", {
      session_id: sessionId,
      user_id: userId,
    });
  }
  return t ? t : null;
}

async function fetchLatestWorkPromptFromLastAnswer(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<string | null> {
  const { data: ans, error: ansErr } = await supabase
    .from("dream_answers")
    .select("work_id, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ansErr) return null;
  const workBlockId = typeof ans?.work_id === "string" ? ans.work_id.trim() : "";
  if (!workBlockId) {
    if (ans) {
      console.warn("work-block/next: latest dream_answers row missing work_id", {
        session_id: sessionId,
        user_id: userId,
      });
    }
    return null;
  }

  const { data: wb, error: wbErr } = await supabase
    .from("work_versions")
    .select("payload, created_at")
    .eq("id", workBlockId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (wbErr || !wb?.payload) return null;
  const p = extractPromptFromPayload(wb.payload);
  return p ? p : null;
}



function extractPromptFromPayload(payload: any): string {
  const prompt = payload?.ai?.prompt ?? payload?.ai?.question ?? "";
  return typeof prompt === "string" ? prompt.trim() : "";
}

function extractMaterialIdFromPayload(payload: any): string | null {
  const materialId = payload?.material_id ?? payload?.trace?.selection?.material_id ?? null;
  return typeof materialId === "string" && materialId ? materialId : null;
}

function normalizeSelectedWithGlossary(
  selected: NonNullable<ReturnType<typeof selectCardMaterial>["selected"]>,
  glossary: GlossaryContext | null
): NonNullable<ReturnType<typeof selectCardMaterial>["selected"]> {
  if (!selected || selected.material.type !== "anchor") return selected;
  const canonical = glossary?.canonical?.trim() ?? "";
  const canonicalKey = glossary?.canonical_key?.trim() ?? "";
  if (!canonical || !canonicalKey) return selected;
  const anchorKeys = selected.material.anchor_keys ?? [];
  if (!anchorKeys.includes(canonicalKey)) return selected;
  return {
    ...selected,
    material: {
      ...selected.material,
      text_snippet: canonical,
    },
  };
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

function similarityToRecent(prompt: string | null | undefined, recent: string[]): { score: number; compared_to: string | null } {
  if (!prompt || !recent.length) return { score: 0, compared_to: null };
  const a = tokenSet(prompt);
  if (!a.size) return { score: 0, compared_to: null };
  let bestScore = 0;
  let bestPrompt: string | null = null;
  for (const r of recent) {
    const sim = jaccard(a, tokenSet(r));
    if (sim > bestScore) {
      bestScore = sim;
      bestPrompt = r;
    }
  }
  return { score: bestScore, compared_to: bestPrompt };
}

function normalizeQuestionHash(prompt: string): string | null {
  const normalized = (prompt ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return sha256(normalized);
}

function directionReason(args: {
  selected_slug: string | null;
  explicit_slug?: string | null;
  direction_candidates?: string[];
  catalog: Array<{ slug: string }>;
}): TraceDebugPayload["direction"]["reason"] {
  if (args.selected_slug && args.explicit_slug && args.selected_slug === args.explicit_slug) {
    const found = args.catalog.some((row) => row.slug === args.explicit_slug);
    if (found) return "explicit";
  }
  if (args.selected_slug && args.direction_candidates?.includes(args.selected_slug)) return "latent";
  return "catalog";
}

function buildDebugTrace(args: {
  selection: TracePayload["selection"];
  session_id: string;
  sequence: number | null;
  explicit_direction_slug?: string | null;
  direction_candidates?: string[];
  catalog: Array<{ slug: string }>;
  recent_material_ids: string[];
  recent_prompts: string[];
  recent_question_hashes_count: number;
  recent_anchor_keys_count: number;
  question_prompt?: string | null;
}): TraceDebugPayload {
  const similarityMax = args.selection.scores?.similarity_max ?? 0;
  const recentSimilarity = similarityToRecent(args.question_prompt ?? null, args.recent_prompts ?? []);
  return {
    session_id: args.session_id,
    sequence: args.sequence ?? null,
    direction: {
      selected_slug: args.selection.direction_slug ?? null,
      reason: directionReason({
        selected_slug: args.selection.direction_slug ?? null,
        explicit_slug: args.explicit_direction_slug ?? null,
        direction_candidates: args.direction_candidates ?? [],
        catalog: args.catalog ?? [],
      }),
    },
    material: {
      kind: args.selection.material_type,
      id: args.selection.material_id,
      anchor_keys: args.selection.anchor_keys,
      anchor_key: args.selection.anchor_keys?.[0] ?? null,
    },
    novelty: {
      recent_material_hit: args.recent_material_ids.includes(args.selection.material_id),
      similarity_max: similarityMax,
      similarity_threshold: SIMILARITY_THRESHOLD,
    },
    ledger: {
      recent_question_hashes_count: args.recent_question_hashes_count,
      recent_anchor_keys_count: args.recent_anchor_keys_count,
    },
    question_fingerprint: args.question_prompt ? normalizeQuestionHash(args.question_prompt) : null,
    similarity_to_recent: {
      score: recentSimilarity.score,
      threshold: SIMILARITY_THRESHOLD,
      compared_to: recentSimilarity.compared_to ? clampText(recentSimilarity.compared_to, 200) : null,
    },
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
    const userId = authData.user.id;

    const body = (await req.json().catch(() => null)) as NextRequest | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) return NextResponse.json({ error: "Hiányzó session_id." }, { status: 400 });

    const sess = await supabase
      .from("dream_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sess.error || !sess.data) return NextResponse.json({ error: "A munkamenet nem található." }, { status: 404 });

    const request_id = crypto.randomUUID();
    const client_request_id = typeof body.client_request_id === "string" ? body.client_request_id.trim() : null;

    const [
      catalog,
      rawDreamText,
      observationLatest,
      latentLatest,
      anchorLatest,
      recentBlocks,
      recentAnchorKeys,
      recentQuestionHashes,
      prevAnswerText,
      prevPrompt,
    ] = await Promise.all([
      fetchDirectionCatalog(supabase),
      fetchLatestRawDreamEntry(supabase, userId, sessionId),
      fetchObservationLatestDreamWithPayloadAndId(supabase, userId, sessionId),
      fetchLatentPayloadLatest(supabase, userId, sessionId),
      fetchAnchorLatestWithPayloadAndId(supabase, userId, sessionId),
      fetchRecentBlocks(supabase, sessionId, userId),
      listRecentAnchorKeys(supabase, { session_id: sessionId, user_id: userId, limit: 120 }),
      listRecentQuestionHashes(supabase, { session_id: sessionId, user_id: userId, limit: 120 }),
      fetchLatestAnswerText(supabase, sessionId, userId),
      fetchLatestWorkPromptFromLastAnswer(supabase, sessionId, userId),
    ]);

    if (!observationLatest?.payload) {
      warnCoreFlowContract("missing_observation_payload", {
        sessionId,
        hasObservationVersionId: Boolean(observationLatest?.observation_version_id),
      });
    }
    if (!latentLatest) {
      warnCoreFlowContract("missing_latent_payload", { sessionId });
    }
    if (!anchorLatest?.payload) {
      warnCoreFlowContract("missing_anchor_payload_before_ensure", { sessionId });
    }
    if (!prevAnswerText) {
      warnCoreFlowContract("missing_previous_answer_content", { sessionId });
    }
    if (!prevPrompt) {
      warnCoreFlowContract("missing_previous_work_prompt", { sessionId });
    }

    let anchorPayload = anchorLatest?.payload ?? null;
    if (!anchorPayload) {
      const ensured = await ensureAnchorsRanked(supabase, { user_id: userId, session_id: sessionId });
      anchorPayload = ensured.payload ?? null;
      if (!anchorPayload) {
        warnCoreFlowContract("anchor_payload_unavailable_after_ensure", { sessionId });
      }
    }

    const observationPayload = observationLatest?.payload ?? null;
    const observationSafety = observationPayload?.safety?.flag ?? null;

    const recentMaterialIds = recentBlocks
      .map((row: any) => extractMaterialIdFromPayload(row?.payload))
      .filter((v: unknown): v is string => typeof v === "string" && v.length > 0);
    const recentPrompts = recentBlocks
      .map((row: any) => extractPromptFromPayload(row?.payload))
      .filter(Boolean);

    const safety = evaluateSafety({ dreamText: rawDreamText ?? "", observationFlag: observationSafety });
    const traceBase = buildRequestTrace({
      request_id,
      client_request_id,
      session_id: sessionId,
      direction_slug: body.direction_slug ?? null,
      seed_kind: body.seed?.kind ?? null,
      prefs_blocked_group_tags: body.prefs?.blocked_group_tags ?? [],
    });

    if (safety.stop) {
      const trace: TracePayload = {
        ...traceBase,
        selection: buildFallbackSelectionTrace({
          direction_slug: body.direction_slug ?? null,
          group_tags: [],
        }),
        model: { name: "safety_gate" },
        stop: { reason_code: safety.stop.reason_code, triggered_by: safety.stop.triggered_by },
      };
      trace.debug = buildDebugTrace({
        selection: trace.selection,
        session_id: sessionId,
        sequence: null,
        explicit_direction_slug: body.direction_slug ?? null,
        direction_candidates: [],
        catalog,
        recent_material_ids: recentMaterialIds,
        recent_prompts: recentPrompts,
        recent_question_hashes_count: (recentQuestionHashes ?? []).length,
        recent_anchor_keys_count: (recentAnchorKeys ?? []).length,
        question_prompt: null,
      });

      const stop = buildStopSignal("safety_limit");
      return NextResponse.json({
        request_id,
        status: "stop",
        debug: trace.debug,
        stop_signal: { ...stop, trace },
      } satisfies NextResponsePayload);
    }

    const latentPayload = latentLatest ?? null;
    traceBase.inputs.latent_source = latentPayload ? "latent_latest" : "none";
    traceBase.inputs.latent_payload_type = latentPayloadType(latentPayload);
    const intentHint = extractIntentHint(latentPayload);
    if (intentHint) traceBase.inputs.intent_hint = intentHint;
    const directionCandidates = recommendDirectionsFromLatent({
      latent: latentPayload,
      catalog,
    }).map((rec) => rec.slug);
    const intentCandidates = buildLatentIntentCandidates({
      latent: latentPayload,
      anchorKeyFn: anchorKey,
      max: 8,
    });

    const materials = extractMaterialsFromObservation(observationPayload);
    const rankedAnchors = extractAnchorsFromRanking(anchorPayload);
    if (rankedAnchors.length > 0) {
      materials.anchors = rankedAnchors;
    }

    const usedAnchorKeys = new Set((recentAnchorKeys ?? []).map((k) => k.trim()).filter(Boolean));

    const selectorResult = selectCardMaterial({
      sessionState: {
        session_id: sessionId,
        intents: intentCandidates,
        anchors: materials.anchors,
        events: materials.events,
        recent_material_ids: recentMaterialIds,
        recent_prompts: recentPrompts,
        ledger_used_anchor_keys: usedAnchorKeys,
        catalog,
        direction_candidates: directionCandidates,
        mode: safety.mode,
      },
      directionSlug: body.direction_slug ?? null,
      seed: body.seed ?? null,
      prefs: body.prefs ?? null,
    });

    if (!selectorResult.selected) {
      const stopReason = selectorResult.reason ?? "low_novelty";
      const selection =
        selectorResult.selection_trace ??
        buildFallbackSelectionTrace({ direction_slug: body.direction_slug ?? null, group_tags: [] });
      const trace: TracePayload = {
        ...traceBase,
        selection,
        model: { name: "selector" },
        stop: { reason_code: stopReason, triggered_by: "selector" },
      };
      trace.debug = buildDebugTrace({
        selection,
        session_id: sessionId,
        sequence: null,
        explicit_direction_slug: body.direction_slug ?? null,
        direction_candidates: directionCandidates,
        catalog,
        recent_material_ids: recentMaterialIds,
        recent_prompts: recentPrompts,
        recent_question_hashes_count: (recentQuestionHashes ?? []).length,
        recent_anchor_keys_count: (recentAnchorKeys ?? []).length,
        question_prompt: null,
      });

      const stop = buildStopSignal(stopReason);
      return NextResponse.json({
        request_id,
        status: "stop",
        debug: trace.debug,
        stop_signal: { ...stop, trace },
      } satisfies NextResponsePayload);
    }

    const glossaryContext =
      selectorResult.selected.material.type === "anchor" && selectorResult.selected.material.anchor_keys?.length
        ? await fetchGlossaryContext({
            supabase,
            userId,
            sessionId,
            anchorKeys: selectorResult.selected.material.anchor_keys,
          })
        : null;

    const selectedForCompose = normalizeSelectedWithGlossary(selectorResult.selected, glossaryContext);

    let composed = await composeCard({
      selected: selectedForCompose,
      intent_hint: intentHint,
      glossary: glossaryContext,
      prev: {
        answer_text: prevAnswerText ? clampText(prevAnswerText, 320) : null,
        prompt: prevPrompt ? clampText(prevPrompt, 200) : null,
      },
    });

    if (!composed) {
      const firstQuestion = await isFirstQuestion(supabase, sessionId, userId);
      if (firstQuestion) {
        composed = buildFallbackCompose({ selected: selectedForCompose });
      } else {
        const selection = selectorResult.selection_trace ?? selectorResult.selected.selection_trace;
        const trace: TracePayload = {
          ...traceBase,
          selection,
          model: { name: "composer", parse_fail: true },
          stop: { reason_code: "model_failure", triggered_by: "composer" },
        };
        trace.debug = buildDebugTrace({
          selection,
          session_id: sessionId,
          sequence: null,
          explicit_direction_slug: body.direction_slug ?? null,
          direction_candidates: directionCandidates,
          catalog,
          recent_material_ids: recentMaterialIds,
          recent_prompts: recentPrompts,
          recent_question_hashes_count: (recentQuestionHashes ?? []).length,
          recent_anchor_keys_count: (recentAnchorKeys ?? []).length,
          question_prompt: null,
        });

        const stop = buildStopSignal("model_failure");
        return NextResponse.json({
          request_id,
          status: "stop",
          debug: trace.debug,
          stop_signal: { ...stop, trace },
        } satisfies NextResponsePayload);
      }
    }

    const selectionTrace = selectorResult.selection_trace ?? selectorResult.selected.selection_trace;
    const trace: TracePayload = {
      ...traceBase,
      selection: selectionTrace,
      model: { name: composed.compose_trace.name ?? "gpt-4o-mini", temperature: composed.compose_trace.temperature },
    };
    trace.debug = buildDebugTrace({
      selection: selectionTrace,
      session_id: sessionId,
      sequence: null,
      explicit_direction_slug: body.direction_slug ?? null,
      direction_candidates: directionCandidates,
      catalog,
      recent_material_ids: recentMaterialIds,
      recent_prompts: recentPrompts,
      recent_question_hashes_count: (recentQuestionHashes ?? []).length,
      recent_anchor_keys_count: (recentAnchorKeys ?? []).length,
      question_prompt: composed.prompt,
    });

    const idempotencyKey = client_request_id
      ? `client:${sessionId}:${client_request_id}`
      : `server:${sessionId}:${request_id}`;
    const input_hash = sha256(idempotencyKey);

    const existing = await supabase
      .from("work_versions")
      .select("id, payload, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("input_hash", input_hash)
      .limit(1)
      .maybeSingle();

    if (existing.data) {
      await upsertWorkLatest(supabase, sessionId, userId, existing.data.id);
      const payload = existing.data.payload ?? {};
      const existingSequence = typeof payload.sequence === "number" ? payload.sequence : null;
      const existingPrompt = extractPromptFromPayload(payload);
      const existingTrace: TracePayload = {
        ...trace,
        debug: buildDebugTrace({
          selection: selectionTrace,
          session_id: sessionId,
          sequence: existingSequence,
          explicit_direction_slug: body.direction_slug ?? null,
          direction_candidates: directionCandidates,
          catalog,
          recent_material_ids: recentMaterialIds,
          recent_prompts: recentPrompts,
          recent_question_hashes_count: (recentQuestionHashes ?? []).length,
          recent_anchor_keys_count: (recentAnchorKeys ?? []).length,
          question_prompt: existingPrompt || composed.prompt,
        }),
      };
      return NextResponse.json({
        request_id,
        status: "ok",
        debug: existingTrace.debug,
        work_block: {
          id: existing.data.id,
          direction_slug: payload.direction_slug ?? selectorResult.selected.direction.slug ?? null,
          group_tags: payload.group_tags ?? composed.group_tags ?? [],
          lead_in: payload.ai?.context ?? composed.lead_in,
          prompt: payload.ai?.prompt ?? payload.ai?.question ?? composed.prompt,
          mode: payload.mode ?? selectorResult.selected.mode,
          trace: existingTrace,
        },
      } satisfies NextResponsePayload);
    }

    const payload = {
      kind: "direction_card",
      direction_slug: composed.direction_slug ?? selectorResult.selected.direction.slug ?? "unknown",
      sequence: 1,
      state: "open",
      group_tags: composed.group_tags ?? [],
      material_id: selectionTrace.material_id ?? null,
      mode: selectorResult.selected.mode,
      ai: { context: composed.lead_in, prompt: composed.prompt },
      user: { answer: null, answered_at: null },
      trace,
      request_id,
      client_request_id,
    };

    const recentAll = await supabase
      .from("work_versions")
      .select("payload")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);

    let maxSeq = 0;
    for (const row of recentAll.data ?? []) {
      const raw = (row as any)?.payload;
      if (!raw || !isDirectionCardContent(raw)) continue;
      if (raw.direction_slug !== payload.direction_slug) continue;
      const seq = typeof raw.sequence === "number" ? raw.sequence : 0;
      if (seq > maxSeq) maxSeq = seq;
    }
    payload.sequence = maxSeq + 1;
    trace.debug = buildDebugTrace({
      selection: selectionTrace,
      session_id: sessionId,
      sequence: payload.sequence,
      explicit_direction_slug: body.direction_slug ?? null,
      direction_candidates: directionCandidates,
      catalog,
      recent_material_ids: recentMaterialIds,
      recent_prompts: recentPrompts,
      recent_question_hashes_count: (recentQuestionHashes ?? []).length,
      recent_anchor_keys_count: (recentAnchorKeys ?? []).length,
      question_prompt: composed.prompt,
    });

    const lastVersion = await supabase
      .from("work_versions")
      .select("version")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1);

    if (lastVersion.error) return NextResponse.json({ error: lastVersion.error.message }, { status: 500 });

    const nextVersion = (lastVersion.data?.[0]?.version ?? 0) + 1;
    const inserted = await supabase
      .from("work_versions")
      .insert({
        session_id: sessionId,
        user_id: userId,
        version: nextVersion,
        input_hash,
        model: composed.compose_trace.name ?? "work_next_v1",
        payload,
      })
      .select("id")
      .single();

    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });

    await upsertWorkLatest(supabase, sessionId, userId, inserted.data.id);

    return NextResponse.json({
      request_id,
      status: "ok",
      debug: trace.debug,
      work_block: {
        id: inserted.data.id,
        direction_slug: payload.direction_slug,
        group_tags: payload.group_tags ?? [],
        lead_in: composed.lead_in,
        prompt: composed.prompt,
        mode: selectorResult.selected.mode,
        trace,
      },
    } satisfies NextResponsePayload);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
