// /app/api/work-block/next/route.ts
// Work-block generator with:
// - PRE observations (dream_observation) as non-interpretive anchors
// - direction continuity + recent work blocks context
// - similarity avoidance + “low_novelty” graceful stop
// - latent log tail enforcement + RPC logging (append_latent_log_event)
// - single, clean callModel() implementation + hard fallbacks

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import type { SynthesizeOutput } from "@/app/api/synthesize/route";
import {
  compactDreamObservation,
  parseDreamObservation,
  type DreamObservation,
} from "@/src/lib/dream/observation";
import { isDirectionCardContent } from "@/src/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// NOTE: Align with DreamObservation safety flags (none|distress|reality_confusion|self_harm)
// + keep "other" for legacy / future-proof.
const SAFETY_VALUES = ["none", "distress", "self_harm", "reality_confusion", "other"] as const;

const MAX_HISTORY = 8;
const MAX_PRIOR_ECHOES = 2;

const LEAD_IN_LIMIT = 720;
const QUESTION_LIMIT = 180;
const CTA_LIMIT = 120;
const BRIEF_ANSWER_LIMIT = 30;

const SIMILARITY_THRESHOLD = 0.72;
const RECENT_QS_FOR_SIMILARITY = 6;

const MAX_LATENT_LOG_TAIL = 6;
const ANSWER_EXCERPT_LIMIT = 120;
const OPENAI_TIMEOUT_MS = 15000;

const MODEL = "gpt-4o-mini";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SafetyValue = (typeof SAFETY_VALUES)[number];

type HistoryItem = { question: string; answer: string | null };
type PriorEcho = { session_id: string; anchor_summary: string; created_at: string };

type DirectionInput = {
  slug?: string;
  title?: string;
  micro_description?: string;
  method_spec?: { question_style?: string } & Record<string, unknown>;
  stop_criteria?: {
    max_cards?: number;
    stop_if_user_brief_streak?: number;
    stop_if_repetition_detected?: boolean;
  } & Record<string, unknown>;
  output_spec?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  focus_model?: Record<string, unknown>;
  selection_hints?: Record<string, unknown>;
  content?: Record<string, unknown>;
};

type DirectionNormalized = {
  slug?: string;
  title?: string;
  micro_description?: string;
  method_spec?: Record<string, unknown>;
  stop_criteria?: DirectionInput["stop_criteria"];
  output_spec?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  focus_model?: Record<string, unknown>;
  selection_hints?: Record<string, unknown>;
};

type SynthInput = {
  flags?: { safety?: string; too_short?: boolean };
};

type WorkBlock = { lead_in: string; question: string; cta: string | null };

type WorkBlockResponse = {
  work_block: WorkBlock;
  stop_signal: { suggest_stop: boolean; reason: string | null };
  flags: { safety: SafetyValue };
};

type RecentWorkBlock = {
  direction_slug: string;
  question: string;
  answer: string | null;
  created_at: string;
};

type RequestBody = {
  session_id?: string;
  dream_text?: string;
  direction?: DirectionInput;
  history?: HistoryItem[];
  synth?: SynthInput;
  prior_echoes?: PriorEcho[];
  allowed_slugs?: unknown;
};

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeSafety(flags?: SynthInput["flags"]): SafetyValue {
  const safety = flags?.safety ?? "none";
  return SAFETY_VALUES.includes(safety as SafetyValue) ? (safety as SafetyValue) : "none";
}

// Simple keyword-based detection (backup).
function detectSafety(dreamText: string): SafetyValue {
  const text = (dreamText ?? "").toLowerCase();

  const selfHarmKeywords = [
    "suicide",
    "kill myself",
    "end my life",
    "öngyilk",
    "megölöm magam",
    "véget vetek",
    "nem akarok élni",
  ];

  const realityConfusionKeywords = [
    "can't tell what's real",
    "not real",
    "hallucinat",
    "nem valós",
    "nem tudom mi a valós",
    "realitás",
  ];

  if (selfHarmKeywords.some((kw) => text.includes(kw))) return "self_harm";
  if (realityConfusionKeywords.some((kw) => text.includes(kw))) return "reality_confusion";
  return "none";
}

function sanitizeHistory(history: HistoryItem[] | undefined): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY)
    .map((item) => ({
      question: typeof item?.question === "string" ? item.question : "",
      answer: typeof item?.answer === "string" ? item.answer : null,
    }))
    .filter((h) => h.question);
}

function sanitizePriorEchoes(echoes: PriorEcho[] | undefined): PriorEcho[] {
  if (!Array.isArray(echoes)) return [];
  return echoes
    .slice(0, MAX_PRIOR_ECHOES)
    .map((p) => ({
      session_id: typeof p?.session_id === "string" ? p.session_id : "",
      anchor_summary: typeof p?.anchor_summary === "string" ? p.anchor_summary : "",
      created_at: typeof p?.created_at === "string" ? p.created_at : "",
    }))
    .filter((p) => p.session_id && p.anchor_summary && p.created_at);
}

type AnchorKind = "characters" | "objects" | "beats" | "places" | "felt_words" | "other";
type AnchorCandidate = { label: string; kind: AnchorKind; priority: number };

const ANCHOR_PRIORITY: Record<AnchorKind, number> = {
  characters: 5,
  objects: 4,
  beats: 3,
  places: 2,
  felt_words: 1,
  other: 0,
};

function extractObservationAnchors(observation: DreamObservation | null): AnchorCandidate[] {
  if (!observation) return [];
  const list: AnchorCandidate[] = [];
  const add = (kind: AnchorKind, items: { label: string }[]) => {
    for (const item of items) {
      if (typeof item?.label === "string" && item.label.trim()) {
        list.push({ label: item.label, kind, priority: ANCHOR_PRIORITY[kind] });
      }
    }
  };

  add("characters", observation.entities.characters);
  add("places", observation.entities.places);
  add("objects", observation.entities.objects);
  add("other", observation.entities.other);
  add("other", observation.motifs);
  add("other", observation.tone);
  add("other", observation.structure);
  add("other", observation.body);

  return list;
}

function sanitizeAllowedSlugs(allowed: unknown, fallbackSlug?: string): string[] {
  if (Array.isArray(allowed)) {
    return allowed
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (fallbackSlug && typeof fallbackSlug === "string" && fallbackSlug.trim()) return [fallbackSlug.trim()];
  return [];
}

function clampText(text: string, limit: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function clampExcerpt(text: string, limit: number): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (limit <= 1) return t.slice(0, Math.max(0, limit));
  return t.length > limit ? t.slice(0, limit - 1).trimEnd() + "…" : t;
}

function clampWorkBlock(block: WorkBlock): WorkBlock {
  return {
    lead_in: clampText(block.lead_in, LEAD_IN_LIMIT),
    question: clampText(block.question, QUESTION_LIMIT),
    cta: block.cta ? clampText(block.cta, CTA_LIMIT) : null,
  };
}

function makeClosureResponse(reason: string | null, safety: SafetyValue): WorkBlockResponse {
  return {
    work_block: clampWorkBlock({
      lead_in: "Köszönöm, hogy megosztottad. Ha szeretnéd, itt most megpihenhetünk.",
      question: "Szeretnéd itt lezárni most?",
      cta: null,
    }),
    stop_signal: { suggest_stop: true, reason },
    flags: { safety },
  };
}

function makeLowNoveltyClosure(safety: SafetyValue): WorkBlockResponse {
  return {
    work_block: clampWorkBlock({
      lead_in:
        "Ebben az irányban most nem látok több olyan érdemi, új fókuszt, ami valóban hozzáadna a feldolgozáshoz, ezért ezt az irányt most lezárjuk.",
      question: "Hogyan szeretnéd folytatni?",
      cta: null,
    }),
    stop_signal: { suggest_stop: true, reason: "low_novelty" },
    flags: { safety },
  };
}

function cleanLeadIn(leadIn: string): string {
  const t = (leadIn ?? "").trim();
  if (!t) return "";
  const q = t.indexOf("?");
  if (q !== -1) {
    const before = t.slice(0, q).trim();
    return before.length >= 12 ? before : "";
  }
  return t;
}

function isSingleSentencePrompt(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if ((t.match(/\n/g) ?? []).length > 0) return false;
  const qCount = (t.match(/\?/g) ?? []).length;
  if (qCount > 1) return false;
  if (qCount === 1 && !t.endsWith("?")) return false;
  const inner = t.endsWith("?") ? t.slice(0, -1) : t;
  if (/[.!]/.test(inner)) return false;
  if (/[;:]/.test(t)) return false;
  if (/\d+\)/.test(t) || /^\s*[-*]\s+/m.test(t)) return false;
  return true;
}

function validateModelOutput(parsed: unknown): WorkBlockResponse | null {
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, any>;
  const workBlock = obj.work_block ?? {};
  const stopSignal = obj.stop_signal ?? {};
  const flags = obj.flags ?? {};

  if (!workBlock || typeof workBlock !== "object") return null;

  const questionRaw = typeof workBlock.question === "string" ? workBlock.question.trim() : "";
  if (!questionRaw) return null;
  if (!isSingleSentencePrompt(questionRaw)) return null;

  const leadInRaw = typeof workBlock.lead_in === "string" ? workBlock.lead_in : "";
  const leadIn = cleanLeadIn(leadInRaw);

  const cta = typeof workBlock.cta === "string" ? workBlock.cta : null;

  const suggestStop = Boolean(stopSignal?.suggest_stop);
  const reason = typeof stopSignal?.reason === "string" ? stopSignal.reason : null;

  const safety = SAFETY_VALUES.includes(flags?.safety as SafetyValue) ? (flags.safety as SafetyValue) : "none";

  return {
    work_block: clampWorkBlock({ lead_in: leadIn, question: questionRaw, cta }),
    stop_signal: { suggest_stop: suggestStop, reason },
    flags: { safety },
  };
}

function normalizeQ(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string) {
  const stop = new Set([
    "a",
    "az",
    "és",
    "hogy",
    "de",
    "ha",
    "is",
    "nem",
    "mi",
    "mit",
    "most",
    "itt",
    "volt",
    "van",
    "lesz",
    "egy",
    "egyik",
    "melyik",
    "milyen",
    "szerint",
    "inkább",
    "kicsit",
    "hogyan",
    "amikor",
    "ami",
    "azt",
  ]);

  return new Set(
    normalizeQ(s)
      .split(" ")
      .filter((w) => w.length >= 3 && !stop.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function isTooSimilar(newQ: string, prevQs: string[], threshold = SIMILARITY_THRESHOLD) {
  const a = tokenSet(newQ);
  if (a.size === 0) return false;
  return prevQs.some((prev) => jaccard(a, tokenSet(prev)) >= threshold);
}

function isExactRepeat(newQ: string, prevQs: string[]) {
  const n = normalizeQ(newQ);
  if (!n) return false;
  return prevQs.some((p) => normalizeQ(p) === n);
}

async function parseModelJSON(rawContent: string): Promise<unknown> {
  try {
    return JSON.parse(rawContent);
  } catch {
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const salvage = rawContent.slice(firstBrace, lastBrace + 1);
      return JSON.parse(salvage);
    }
    throw new Error("Invalid JSON from model");
  }
}

// -----------------------------------------------------------------------------
// DB helpers
// -----------------------------------------------------------------------------

async function fetchDreamObservation(args: { supabase: any; sessionId: string; userId: string }) {
  try {
    const { data, error } = await args.supabase
      .from("dream_observation")
      .select("obs")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .maybeSingle();

    if (error) {
      console.warn("fetch dream observation failed", error.message);
      return null;
    }

    return parseDreamObservation(data?.obs ?? null);
  } catch (error) {
    console.warn("fetch dream observation exception", error);
    return null;
  }
}

async function fetchRecentWorkBlocks(args: {
  supabase: any;
  sessionId: string;
  directionSlug?: string;
  limit?: number;
}): Promise<RecentWorkBlock[]> {
  try {
    let query = args.supabase
      .from("work_blocks")
      .select("content, created_at")
      .eq("session_id", args.sessionId)
      .eq("block_type", "dream_analysis")
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 6);

    if (args.directionSlug) {
      query = query.eq("content->>direction_slug", args.directionSlug);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("fetch recent work blocks failed", error.message);
      return [];
    }

    const mapped: Array<RecentWorkBlock | null> = (data ?? []).map(
      (row: any): RecentWorkBlock | null => {
        const content = row?.content;
        if (!isDirectionCardContent(content)) return null;

        const question = typeof content.ai?.question === "string" ? content.ai.question : "";
        if (!question) return null;

        return {
          direction_slug: content.direction_slug,
          question,
          answer: typeof content.user?.answer === "string" ? content.user.answer : null,
          created_at: typeof row.created_at === "string" ? row.created_at : "",
        };
      }
    );

    return mapped.filter(
      (row: RecentWorkBlock | null): row is RecentWorkBlock => !!row && Boolean(row.created_at)
    );
  } catch (error) {
    console.warn("fetch recent work blocks exception", error);
    return [];
  }
}

// Latent log helpers
function safeArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

function buildLatentLogTail(log: any, limit = MAX_LATENT_LOG_TAIL) {
  const arr = safeArray(log)
    .map((e) => (e && typeof e === "object" ? e : null))
    .filter(Boolean) as any[];

  const tail = arr.slice(-limit);

  return tail.map((e) => {
    const meta = e?.meta && typeof e.meta === "object" ? e.meta : {};
    const ev = e?.event && typeof e.event === "object" ? e.event : {};
    return {
      ts: typeof e?.ts === "string" ? e.ts : null,
      source: typeof meta?.source === "string" ? meta.source : null,
      event: typeof ev?.type === "string" ? ev.type : null,
      direction_slug: typeof ev?.direction_slug === "string" ? ev.direction_slug : null,
      question: typeof ev?.question === "string" ? ev.question : null,
      anchor_used: typeof ev?.anchor_used === "string" ? ev.anchor_used : null,
      answer_len: typeof meta?.answer_len === "number" ? meta.answer_len : null,
      stop_reason: typeof ev?.reason === "string" ? ev.reason : null,
    };
  });
}

async function fetchLatentFromDb(args: { supabase: any; sessionId: string; userId: string }) {
  try {
    const { data, error } = await args.supabase
      .from("dream_session_summaries")
      .select("latent_analysis, latent_analysis_log")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .maybeSingle();

    if (error) {
      console.warn("fetch latent db failed", error.message);
      return { latent_analysis: null as any, latent_log_tail: [] as any[] };
    }

    const latent_analysis = (data as any)?.latent_analysis ?? null;
    const latent_log_tail = buildLatentLogTail((data as any)?.latent_analysis_log ?? null);

    return { latent_analysis, latent_log_tail };
  } catch (e: any) {
    console.warn("fetch latent db exception", e?.message ?? e);
    return { latent_analysis: null as any, latent_log_tail: [] as any[] };
  }
}

async function appendLatentLogEvent(
  req: Request,
  args: {
    sessionId: string;
    event: Record<string, unknown>;
    meta: Record<string, unknown>;
  }
) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    const { error } = await supabase.rpc("append_latent_log_event", {
      p_session_id: args.sessionId,
      p_event: args.event,
      p_meta: args.meta,
    });

    if (error) console.warn("append_latent_log_event failed", error.message);
  } catch (e: any) {
    console.warn("appendLatentLogEvent exception", e?.message ?? e);
  }
}

// -----------------------------------------------------------------------------
// Synthesize call (server-to-server)
// -----------------------------------------------------------------------------

async function runLatentSynthesis(args: {
  req: Request;
  sessionId: string;
  dreamText: string;
  history: HistoryItem[];
  priorEchoes: PriorEcho[];
  allowedSlugs: string[];
}): Promise<SynthesizeOutput | null> {
  const url = new URL("/api/synthesize", args.req.url).toString();
  const cookieHeader = args.req.headers.get("cookie") ?? "";
  const authHeader = args.req.headers.get("authorization") ?? "";

  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        session_id: args.sessionId,
        dream_text: args.dreamText,
        history: args.history,
        prior_echoes: args.priorEchoes,
        allowed_slugs: args.allowedSlugs,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("synthesize non-OK", res.status, text.slice(0, 400));
      return null;
    }

    const json = (await res.json().catch(() => null)) as SynthesizeOutput | null;
    return json ?? null;
  } catch (err) {
    console.warn("synthesize failed", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Direction normalization
// -----------------------------------------------------------------------------

function unwrapDirection(direction: DirectionInput | undefined | null): DirectionNormalized | null {
  if (!direction || typeof direction !== "object") return null;

  const asRecord = (val: unknown) => (val && typeof val === "object" ? (val as Record<string, unknown>) : undefined);

  const content = asRecord((direction as any).content) ?? asRecord(direction);

  const methodSpec = (asRecord(content?.method_spec) ?? asRecord((direction as any).method_spec)) ?? undefined;
  const stopCriteria = asRecord(content?.stop_criteria) ?? asRecord((direction as any).stop_criteria) ?? undefined;
  const outputSpec = asRecord(content?.output_spec) ?? asRecord((direction as any).output_spec) ?? undefined;
  const safety = asRecord(content?.safety) ?? asRecord((direction as any).safety) ?? undefined;
  const focusModel = asRecord(content?.focus_model) ?? asRecord((direction as any).focus_model) ?? undefined;
  const selectionHints = asRecord(content?.selection_hints) ?? asRecord((direction as any).selection_hints) ?? undefined;

  const microDescriptionCandidate =
    typeof (content as any)?.micro_description === "string"
      ? (content as any).micro_description
      : typeof (direction as any)?.micro_description === "string"
        ? (direction as any).micro_description
        : undefined;

  const normalized: DirectionNormalized = {
    slug: typeof (direction as any)?.slug === "string" ? (direction as any).slug : undefined,
    title: typeof (direction as any)?.title === "string" ? (direction as any).title : undefined,
    micro_description: microDescriptionCandidate,
    method_spec: methodSpec,
    stop_criteria: stopCriteria as DirectionInput["stop_criteria"],
    output_spec: outputSpec,
    safety,
    focus_model: focusModel,
    selection_hints: selectionHints,
  };

  const hasContent =
    normalized.micro_description ||
    normalized.method_spec ||
    normalized.stop_criteria ||
    normalized.output_spec ||
    normalized.safety ||
    normalized.focus_model ||
    normalized.selection_hints;

  if (!normalized.slug && !hasContent) return null;
  return normalized;
}

function buildDirectionForAI(direction: DirectionNormalized | undefined) {
  if (!direction) return undefined;

  const methodSpec = direction.method_spec ?? {};
  const methodSpecForAI: Record<string, unknown> = {};

  if (typeof (methodSpec as any)?.question_style === "string") {
    methodSpecForAI.question_style = (methodSpec as any).question_style;
  }
  if ("aim" in methodSpec) methodSpecForAI.aim = (methodSpec as any).aim;
  if ("do" in methodSpec) methodSpecForAI.do = (methodSpec as any).do;
  if ("dont" in methodSpec) methodSpecForAI.dont = (methodSpec as any).dont;

  const directionForAI: Record<string, unknown> = {};

  if (direction.slug) directionForAI.slug = direction.slug;
  if (direction.title) directionForAI.title = direction.title;
  if (direction.micro_description) directionForAI.micro_description = direction.micro_description;

  if (Object.keys(methodSpecForAI).length) directionForAI.method_spec = methodSpecForAI;

  if (direction.stop_criteria) directionForAI.stop_criteria = direction.stop_criteria;
  if (direction.output_spec) directionForAI.output_spec = direction.output_spec;
  if (direction.safety) directionForAI.safety = direction.safety;
  if (direction.focus_model) directionForAI.focus_model = direction.focus_model;
  if (direction.selection_hints) directionForAI.selection_hints = direction.selection_hints;

  return Object.keys(directionForAI).length ? directionForAI : undefined;
}

// -----------------------------------------------------------------------------
// Stop rules
// -----------------------------------------------------------------------------

function detectRepetition(history: HistoryItem[], stopIfRepetition?: boolean): boolean {
  if (!stopIfRepetition) return false;
  if (history.length < 2) return false;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  return last.question === prev.question && (last.answer ?? "") === (prev.answer ?? "");
}

function detectUserBriefStreak(history: HistoryItem[], streak?: number): boolean {
  if (!streak || streak <= 0) return false;
  const recent = history.slice(-streak);
  if (recent.length < streak) return false;
  return recent.every((h) => (h.answer ?? "").trim().length <= BRIEF_ANSWER_LIMIT);
}

function shouldStop(direction: DirectionNormalized | undefined, history: HistoryItem[]) {
  const stopCriteria = direction?.stop_criteria ?? {};

  const maxCards = typeof (stopCriteria as any).max_cards === "number" ? (stopCriteria as any).max_cards : undefined;
  if (maxCards && history.length >= maxCards) return { suggest_stop: true, reason: "max_cards" as const };

  if (detectRepetition(history, !!(stopCriteria as any).stop_if_repetition_detected)) {
    return { suggest_stop: true, reason: "repetition" as const };
  }

  if (detectUserBriefStreak(history, (stopCriteria as any).stop_if_user_brief_streak)) {
    return { suggest_stop: true, reason: "user_brief_streak" as const };
  }

  return { suggest_stop: false, reason: null as string | null };
}

// -----------------------------------------------------------------------------
// Anchors
// -----------------------------------------------------------------------------

function addAnchorCandidates(list: AnchorCandidate[], kind: AnchorKind, values: unknown) {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      list.push({ label: value, kind, priority: ANCHOR_PRIORITY[kind] });
    }
  }
}

function getAnchorCandidates(latent: any, synth: any): AnchorCandidate[] {
  const list: AnchorCandidate[] = [];

  if (latent && typeof latent === "object" && latent.anchors) {
    addAnchorCandidates(list, "characters", latent.anchors.characters);
    addAnchorCandidates(list, "places", latent.anchors.places);
    addAnchorCandidates(list, "objects", latent.anchors.objects);
    addAnchorCandidates(list, "beats", latent.anchors.beats);
    addAnchorCandidates(list, "felt_words", latent.anchors.felt_words);
  }

  if (synth && typeof synth === "object" && synth.anchors) {
    addAnchorCandidates(list, "characters", synth.anchors.characters);
    addAnchorCandidates(list, "places", synth.anchors.places);
    addAnchorCandidates(list, "objects", synth.anchors.objects);
    addAnchorCandidates(list, "beats", synth.anchors.beats);
    addAnchorCandidates(list, "felt_words", synth.anchors.felt_words);
  }

  return mergeAnchorCandidatesDetailed(list, []);
}

function mergeAnchorCandidatesDetailed(base: AnchorCandidate[], extra: AnchorCandidate[]): AnchorCandidate[] {
  const out: AnchorCandidate[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of [...base, ...extra]) {
    const key = item.label.toLowerCase().trim();
    if (!key) continue;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, out.length);
      out.push(item);
      continue;
    }
    const existing = out[existingIndex];
    if (item.priority > existing.priority) out[existingIndex] = item;
  }

  return out;
}

function flattenAnchorCandidates(candidates: AnchorCandidate[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of candidates) {
    const key = item.label.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.label);
  }
  return out;
}

function detectAnchorUsed(question: string, anchors: AnchorCandidate[]): string | null {
  const qTokens = tokenSet(question);
  let best: { anchor: AnchorCandidate; wordCount: number; length: number } | null = null;

  for (const anchor of anchors) {
    const aTokens = tokenSet(anchor.label);
    if (aTokens.size === 0) continue;
    let hasAllTokens = true;
    for (const token of aTokens) {
      if (!qTokens.has(token)) {
        hasAllTokens = false;
        break;
      }
    }
    if (!hasAllTokens) continue;
    const candidate = { anchor, wordCount: aTokens.size, length: anchor.label.length };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.anchor.priority > best.anchor.priority) {
      best = candidate;
      continue;
    }
    if (candidate.anchor.priority === best.anchor.priority && candidate.wordCount > best.wordCount) {
      best = candidate;
      continue;
    }
    if (
      candidate.anchor.priority === best.anchor.priority &&
      candidate.wordCount === best.wordCount &&
      candidate.length > best.length
    ) {
      best = candidate;
    }
  }

  return best?.anchor.label ?? null;
}

function extractUsedAnchors(prevQs: string[], candidates: AnchorCandidate[]): Set<string> {
  const used = new Set<string>();
  for (const q of prevQs) {
    const a = detectAnchorUsed(q, candidates);
    if (a) used.add(a);
  }
  return used;
}

// -----------------------------------------------------------------------------
// Prompt construction
// -----------------------------------------------------------------------------

function buildBaseSystemPrompt(availableAnchors: string[]) {
  return [
    "Magyar nyelvű API vagy, kizárólag a megadott JSON sémát adod vissza.",
    "Szerep: a következő kártyára egy WORK blokkot generálsz: lead_in + question (+ opcionális cta).",
    "",
    "LEAD_IN vs FÓKUSZ-MAG:",
    "- lead_in = 2–4 mondatnyi térnyitó ráhangolás, amely finoman a direction irányába tereli a figyelmet.",
    "- lead_in NEM kérdés és NEM tartalmaz '?' jelet.",
    "",
    "- question = a kártya egyetlen mondata (UI-kötelező), ami egy fókusz-aktus:",
    "  - VAGY 1 kérdés (pontosan 1 '?' a végén),",
    "  - VAGY 1 feladat/utasítás (0 '?').",
    "  - Mindig 1 mondat: nincs felsorolás, nincs kettőspont, nincs pontosvessző, nincs sortörés.",
    "",
    "KÖTELEZŐ ILLESZKEDÉS AZ IRÁNYHOZ:",
    "- A direction.method_spec.question_style szerint formáld a question-t.",
    "- Használd a direction.micro_description + focus_model + selection_hints elemeit.",
    "",
    "LATENS SZINTÉZIS (ha van):",
    "- Ha kapsz synth.question_seed.target_anchor-t, akkor a lead_in nyissa meg ezt mint fókuszpontot,",
    "- és a question irányítsa a figyelmet erre az anchor-ra a direction stílusában.",
    "",
    "WORK-MEMÓRIA (latent_log_tail):",
    "- A latent_log_tail a korábbi work lépések KIVONATA.",
    "- Tilos ismételni vagy újrafogalmazni a korábbi kérdéseket; kerüld az ugyanoda vezető fókuszt is.",
    "",
    "PRE MEGFIGYELÉSEK (dream_observation):",
    "- Csak megfigyelésekre támaszkodj, NINCS értelmezés.",
    "- Használd a konkrét elemeket horgonyként vagy fókuszpontként.",
    "",
    "IRÁNY FOLYTONOSSÁG:",
    "- Tartsd magad a direction.slug-hoz és a recent_work_blocks irányához.",
    "- Ne válts irányt, ne terelj át más irányba.",
    "",
    availableAnchors.length > 0
      ? `- Válassz PONTOSAN 1 horgonyt az alábbi listából, amit eddig NEM használtunk: ${availableAnchors.join(
          " | "
        )}`
      : "- Nincs több új horgony ebben az irányban; ha elfogyott, jelezd low_novelty-t.",
    "",
    "ANTI-GENERIKUS SZABÁLY:",
    "- A question tartalmazzon 1 konkrét horgonyt a dream_text-ből VAGY a legutóbbi answer-ből.",
    "- + legyen benne 1 irány-nyelvi fókusz (a direction szókészletéből).",
    "",
    "SZIGORÚ NEM-ISMÉTLÉS:",
    "- Tilos megismételni vagy parafrazálni bármelyik korábbi kérdést/feladatot.",
    "- Ha hasonló lenne, válts teljesen más konkrét részletre ugyanabban az irányban.",
    "",
    "Biztonság:",
    "- Ne értelmezd az álmot, ne diagnosztizálj, ne szimbólumszótár.",
    "",
    "Formai szabályok:",
    "- Karakterlimitek: lead_in <= 720, question <= 180, cta <= 120.",
    "- Mindig legyen stop_signal mező (normál: suggest_stop=false).",
    "",
    "Kimenet kizárólag JSON ebben a sémában:",
    '{"work_block":{"lead_in":"","question":"","cta":""},"stop_signal":{"suggest_stop":false,"reason":null},"flags":{"safety":"none"}}',
  ].join("\n");
}

function buildSafetyExtraRules(compactObs: ReturnType<typeof compactDreamObservation> | null): string[] {
  const flag = compactObs?.safety?.flag;
  if (!flag || flag === "none") return [];
  return [
    "SAFETY: finomíts, lassíts, ne mélyíts; kérdés legyen rövid és nem nyomulós.",
    "SAFETY: adj opt-out hangnemet (pl. 'ha most jólesik').",
    "SAFETY: ne menj bele intenzív érzelmi nyomásba, ne kényszeríts döntésre.",
  ];
}

// -----------------------------------------------------------------------------
// Main handler
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = authData.user.id;
    const body = (await req.json()) as RequestBody;

    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
    const dreamText = (body.dream_text ?? "").trim();
    const direction = unwrapDirection(body.direction as DirectionInput);
    const history = sanitizeHistory(body.history);
    const priorEchoes = sanitizePriorEchoes(body.prior_echoes);
    const safetyFlag = sanitizeSafety(body.synth?.flags);

    if (!dreamText) return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });
    if (!direction) return NextResponse.json({ error: "Missing direction" }, { status: 400 });
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const lastAnswer = history.length ? (history[history.length - 1]?.answer ?? "") : "";
    const answerExcerpt = clampExcerpt(lastAnswer, ANSWER_EXCERPT_LIMIT);
    const answerLen = (lastAnswer ?? "").trim().length;

    const [dbLatentPack, observation, recentWorkBlocks] = await Promise.all([
      fetchLatentFromDb({ supabase, sessionId, userId }),
      fetchDreamObservation({ supabase, sessionId, userId }),
      fetchRecentWorkBlocks({ supabase, sessionId, directionSlug: direction.slug, limit: 6 }),
    ]);

    const compactObservation = compactDreamObservation(observation);
    const observationAnchors = extractObservationAnchors(observation);

    // Safety gates (hard stop)
    if (safetyFlag !== "none") {
      const out = makeClosureResponse("safety", safetyFlag);
      await appendLatentLogEvent(req, {
        sessionId,
        event: { type: "stop_pre", reason: "safety", direction_slug: direction.slug ?? null },
        meta: {
          source: "work-block/next",
          safety: safetyFlag,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
        },
      });
      return NextResponse.json(out);
    }

    const detectedSafety = detectSafety(dreamText);
    if (detectedSafety !== "none") {
      const out = makeClosureResponse("safety", detectedSafety);
      await appendLatentLogEvent(req, {
        sessionId,
        event: { type: "stop_pre", reason: "safety", direction_slug: direction.slug ?? null },
        meta: {
          source: "work-block/next",
          safety: detectedSafety,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
        },
      });
      return NextResponse.json(out);
    }

    const stopSignal = shouldStop(direction, history);
    if (stopSignal.suggest_stop) {
      const out = makeClosureResponse(stopSignal.reason, "none");
      await appendLatentLogEvent(req, {
        sessionId,
        event: { type: "stop_pre", reason: stopSignal.reason, direction_slug: direction.slug ?? null },
        meta: {
          source: "work-block/next",
          safety: "none",
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
        },
      });
      return NextResponse.json(out);
    }

    // Prepare direction spec and allowed slugs.
    const directionForAI = buildDirectionForAI(direction);
    const allowedSlugs = sanitizeAllowedSlugs(body.allowed_slugs, direction.slug);

    const synth = await runLatentSynthesis({
      req,
      sessionId,
      dreamText,
      history,
      priorEchoes,
      allowedSlugs,
    });

    const prevQsAll = history.map((h) => h.question).filter(Boolean);
    const prevQsRecent = prevQsAll.slice(-RECENT_QS_FOR_SIMILARITY);

    const anchorCandidatesDetailed = mergeAnchorCandidatesDetailed(
      getAnchorCandidates(dbLatentPack.latent_analysis, synth),
      observationAnchors
    );
    const anchorCandidates = flattenAnchorCandidates(anchorCandidatesDetailed);

    const usedAnchors = extractUsedAnchors(prevQsAll, anchorCandidatesDetailed);
    const availableAnchors = anchorCandidates.filter((a) => !usedAnchors.has(a));

    const baseSystemPrompt = buildBaseSystemPrompt(availableAnchors);

    const userPayload = {
      dream_text: dreamText,
      direction: directionForAI ?? {},
      history,
      prior_echoes: priorEchoes,
      synth: synth ?? null,
      latent_analysis_snapshot: dbLatentPack.latent_analysis ?? null,
      latent_log_tail: dbLatentPack.latent_log_tail ?? [],
      last_answer_excerpt: answerExcerpt,
      available_anchors: availableAnchors,
      dream_observation: compactObservation,
      recent_work_blocks: recentWorkBlocks,
    };

    const safetyExtraRules = buildSafetyExtraRules(compactObservation);

    // Single, clean model call (with hard fallback)
    async function callModel(extraRules: string[] = []): Promise<WorkBlockResponse> {
      const systemPrompt = [baseSystemPrompt, ...extraRules].join("\n");

      try {
        const completion = await withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model: MODEL,
                temperature: 0.25,
                presence_penalty: 0.25,
                frequency_penalty: 0.25,
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: JSON.stringify(userPayload) },
                ],
                max_tokens: 650,
              },
              { signal }
            ),
          OPENAI_TIMEOUT_MS
        );

        const rawContent = completion.choices?.[0]?.message?.content ?? "";
        const parsed = await parseModelJSON(rawContent);
        const sanitized = validateModelOutput(parsed);

        if (!sanitized) return makeLowNoveltyClosure("none");
        return sanitized;
      } catch (err) {
        console.warn("work-block: model call failed", err);
        return makeLowNoveltyClosure("none");
      }
    }

    // Attempt 1
    const first = await callModel(safetyExtraRules);

    const tooSimilar1 =
      (prevQsRecent.length > 0 && isTooSimilar(first.work_block.question, prevQsRecent)) ||
      isExactRepeat(first.work_block.question, prevQsAll);

    const anchorUsedFirst = detectAnchorUsed(first.work_block.question, anchorCandidatesDetailed);

    if (!tooSimilar1) {
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "work_step_generated",
          direction_slug: direction.slug ?? null,
          question: first.work_block.question,
          reason: first.stop_signal?.suggest_stop ? first.stop_signal.reason : null,
          anchor_used: anchorUsedFirst ?? null,
        },
        meta: {
          source: "work-block/next",
          model: MODEL,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: false,
        },
      });
      return NextResponse.json(first);
    }

    // Attempt 2 (retry)
    const retry = await callModel([
      ...safetyExtraRules,
      `TILOS: ezekkel megegyező vagy ezek parafrázisa: ${prevQsRecent.join(" | ")}`,
      availableAnchors.length > 0
        ? `Válassz egy MÁSik horgonyt a listából (elérhető anchors: ${availableAnchors.join(" | ")}).`
        : `Nincs új horgony, ezért low_novelty lehet a helyes válasz.`,
      "KÖTELEZŐ: válts teljesen más konkrét részletre ugyanabban az irányban.",
      "Ha nem tudsz érdemben új fókuszt, add vissza a sémát úgy, hogy stop_signal.suggest_stop=true és reason='low_novelty'.",
    ]);

    const tooSimilar2 =
      (prevQsRecent.length > 0 && isTooSimilar(retry.work_block.question, prevQsRecent)) ||
      isExactRepeat(retry.work_block.question, prevQsAll);

    const anchorUsedRetry = detectAnchorUsed(retry.work_block.question, anchorCandidatesDetailed);

    if (retry.stop_signal?.suggest_stop) {
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "stop_post",
          reason: retry.stop_signal.reason ?? "low_novelty",
          direction_slug: direction.slug ?? null,
          question: retry.work_block.question,
          anchor_used: anchorUsedRetry ?? null,
        },
        meta: {
          source: "work-block/next",
          model: MODEL,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: true,
        },
      });
      return NextResponse.json(retry);
    }

    if (tooSimilar2) {
      const out = makeLowNoveltyClosure("none");
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "stop_post",
          reason: "low_novelty",
          direction_slug: direction.slug ?? null,
          question: null,
          anchor_used: null,
        },
        meta: {
          source: "work-block/next",
          model: MODEL,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: true,
          note: "second_try_still_similar",
        },
      });
      return NextResponse.json(out);
    }

    await appendLatentLogEvent(req, {
      sessionId,
      event: {
        type: "work_step_generated",
        direction_slug: direction.slug ?? null,
        question: retry.work_block.question,
        reason: retry.stop_signal?.suggest_stop ? retry.stop_signal.reason : null,
        anchor_used: anchorUsedRetry ?? null,
      },
      meta: {
        source: "work-block/next",
        model: MODEL,
        history_count: history.length,
        answer_len: answerLen,
        answer_excerpt: answerExcerpt,
        similarity_retry: true,
      },
    });

    return NextResponse.json(retry);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
