import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { fetchDirectionCatalog } from "@/src/db/repositories/catalogRepo";
import {
  fetchAnchorLatestWithPayloadAndId,
  fetchLatestRawDreamEntry,
  fetchLatentPayloadLatest,
  fetchObservationLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { ensureAnchorsRanked } from "@/src/orchestration/ensureAnchorsRanked";
import { recommendDirectionsFromLatent } from "@/src/domain/directions/recommendDirectionsFromLatent";
import { selectCardMaterial } from "@/src/domain/work/selector/CardMaterialSelector";
import { COMPOSE_MAX_ATTEMPTS, composeCard } from "@/src/domain/work/composer/CardComposer";
import { evaluateSafety } from "@/src/domain/work/safety/SafetyGate";
import { buildStopSignal } from "@/src/domain/work/stop/StopEngine";
import { buildLatentIntentCandidates } from "@/src/domain/work/materials/latentIntent";
import type { TracePayload } from "@/src/domain/work/trace/TraceTypes";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { shouldKeepAnchorKey, shouldKeepAnchorLabel } from "@/src/lib/dream/huAnchorHygiene";
import { isDirectionCardContent } from "@/src/lib/types";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { listRecentAnchorKeys } from "@/src/db/repositories/workQuestionLedgerRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function coerceLatentPayload(args: {
  latentLatest: any;
  summaryLatent: any;
}): { payload: any | null; source: "latent_latest" | "summary" | "none"; payload_type: "object" | "string" | "null" } {
  const rawLatest = args.latentLatest?.payload ?? null;
  if (rawLatest !== null && rawLatest !== undefined) {
    return { payload: parseLatentPayload(rawLatest), source: "latent_latest", payload_type: latentPayloadType(rawLatest) };
  }

  if (args.summaryLatent !== null && args.summaryLatent !== undefined) {
    return { payload: parseLatentPayload(args.summaryLatent), source: "summary", payload_type: latentPayloadType(args.summaryLatent) };
  }

  return { payload: null, source: "none", payload_type: "null" };
}

function latentPayloadType(raw: unknown): "object" | "string" | "null" {
  if (typeof raw === "string") return "string";
  if (raw && typeof raw === "object") return "object";
  return "null";
}

function parseLatentPayload(raw: unknown): any | null {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") return raw;
  return null;
}

async function fetchSessionSummary(supabase: any, sessionId: string, userId: string): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("dream_session_summaries")
      .select("latent_analysis")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    return data?.latent_analysis ?? null;
  } catch {
    return null;
  }
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

function extractPromptFromPayload(payload: any): string {
  const prompt = payload?.ai?.prompt ?? payload?.ai?.question ?? "";
  return typeof prompt === "string" ? prompt.trim() : "";
}

function extractMaterialIdFromPayload(payload: any): string | null {
  const materialId = payload?.material_id ?? payload?.trace?.selection?.material_id ?? null;
  return typeof materialId === "string" && materialId ? materialId : null;
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
    const userId = authData.user.id;

    const body = (await req.json()) as NextRequest;
    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
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

    const [catalog, rawDreamText, observationLatest, latentLatest, summaryLatent, anchorLatest, recentBlocks, recentAnchorKeys] =
      await Promise.all([
        fetchDirectionCatalog(supabase),
        fetchLatestRawDreamEntry(supabase, userId, sessionId),
        fetchObservationLatestWithPayloadAndId(supabase, userId, sessionId),
        fetchLatentPayloadLatest(supabase, userId, sessionId),
        fetchSessionSummary(supabase, sessionId, userId),
        fetchAnchorLatestWithPayloadAndId(supabase, userId, sessionId),
        fetchRecentBlocks(supabase, sessionId, userId),
        listRecentAnchorKeys(supabase, { session_id: sessionId, user_id: userId, limit: 120 }),
      ]);

    let anchorPayload = anchorLatest?.payload ?? null;
    if (!anchorPayload) {
      const ensured = await ensureAnchorsRanked(supabase, { user_id: userId, session_id: sessionId });
      anchorPayload = ensured.payload ?? null;
    }

    const observationPayload = observationLatest?.payload ?? null;
    const observationSafety = observationPayload?.safety?.flag ?? null;

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

      const stop = buildStopSignal("safety_limit");
      return NextResponse.json({
        request_id,
        status: "stop",
        stop_signal: { ...stop, trace },
      } satisfies NextResponsePayload);
    }

    const latentCoerce = coerceLatentPayload({ latentLatest, summaryLatent });
    const latentPayload = latentCoerce.payload;
    traceBase.inputs.latent_source = latentCoerce.source;
    traceBase.inputs.latent_payload_type = latentCoerce.payload_type;
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
    const recentMaterialIds = recentBlocks
      .map((row: any) => extractMaterialIdFromPayload(row?.payload))
      .filter((v: unknown): v is string => typeof v === "string" && v.length > 0);
    const recentPrompts = recentBlocks
      .map((row: any) => extractPromptFromPayload(row?.payload))
      .filter(Boolean);

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
      const trace: TracePayload = {
        ...traceBase,
        selection:
          selectorResult.selection_trace ??
          buildFallbackSelectionTrace({ direction_slug: body.direction_slug ?? null, group_tags: [] }),
        model: { name: "selector" },
        stop: { reason_code: stopReason, triggered_by: "selector" },
      };

      const stop = buildStopSignal(stopReason);
      return NextResponse.json({
        request_id,
        status: "stop",
        stop_signal: { ...stop, trace },
      } satisfies NextResponsePayload);
    }

    let composed = await composeCard({ selected: selectorResult.selected, intent_hint: intentHint });
    if (!composed) {
      const firstQuestion = await isFirstQuestion(supabase, sessionId, userId);
      if (firstQuestion) {
        composed = buildFallbackCompose({ selected: selectorResult.selected });
      } else {
        const trace: TracePayload = {
          ...traceBase,
          selection: selectorResult.selection_trace ?? selectorResult.selected.selection_trace,
          model: { name: "composer", parse_fail: true },
          stop: { reason_code: "model_failure", triggered_by: "composer" },
        };

        const stop = buildStopSignal("model_failure");
        return NextResponse.json({
          request_id,
          status: "stop",
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
      return NextResponse.json({
        request_id,
        status: "ok",
        work_block: {
          id: existing.data.id,
          direction_slug: payload.direction_slug ?? selectorResult.selected.direction.slug ?? null,
          group_tags: payload.group_tags ?? composed.group_tags ?? [],
          lead_in: payload.ai?.context ?? composed.lead_in,
          prompt: payload.ai?.prompt ?? payload.ai?.question ?? composed.prompt,
          mode: payload.mode ?? selectorResult.selected.mode,
          trace,
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
