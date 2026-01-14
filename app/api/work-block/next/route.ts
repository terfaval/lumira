// /app/api/work-block/next/route.ts
// Work-block generator with:
// - PRE observations (dream_observation) as non-interpretive anchors
// - direction continuity + recent work blocks context
// - similarity avoidance + “low_novelty” graceful stop
// - latent log tail enforcement + RPC logging (append_latent_log_event)
// - single, clean callModel() implementation + hard fallbacks
//
// UPDATED:
// - Uses work_question_ledger to avoid re-asking the same anchors (keyed, not string-matching only)
// - Writes each accepted question into work_question_ledger with anchor_keys
// - Keeps the existing similarity / repetition guards (belt + suspenders)

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
import { pickNextAnchorKey } from "@/src/lib/dream/pickNextAnchorKey";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { fetchUsedAnchorKeysFromLedger, insertLedgerQuestion } from "@/src/lib/dream/workLedger";

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

const SIMILARITY_THRESHOLD = 0.65;
const MIN_SIM_TOKENS = 5;
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

type AnchorPolicy = "required" | "preferred" | "optional";

type DirectionProfile = {
  slug?: string;
  title?: string;
  micro_description?: string;
  ai_contract: {
    role: string; // pl. "guide"
    stance: string[]; // pl. ["non-clinical","descriptive-only"]
    tone_tags: string[]; // pl. ["gentle","slow","minimal-friction"]
    pacing: { max_steps: number; max_depth: number };
  };
  question_style: string; // pl. "sequence_probe_single"
  focus_model: { primary: string[]; secondary: string[] };
  anchor_policy: AnchorPolicy; // required|preferred|optional
  stop_criteria: {
    max_cards?: number;
    stop_if_user_brief_streak?: number;
    stop_if_repetition_detected?: boolean;
    stop_if_emotional_overload?: boolean; // későbbre (most csak átadjuk)
  };
  mini_lexicon: string[];
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

function concatRecentAnswers(history: HistoryItem[], n = 6): string {
  return history
    .slice(-n)
    .map((h) => (h.answer ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function coverageScore(question: string, recentAnswersText: string): number {
  const q = tokenSet(question);
  if (q.size < MIN_SIM_TOKENS) return 0;

  const a = tokenSet(recentAnswersText);
  if (a.size === 0) return 0;

  let covered = 0;
  for (const t of q) if (a.has(t)) covered++;
  return q.size === 0 ? 0 : covered / q.size;
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
// Anchor key normalisation (for ledger)
// -----------------------------------------------------------------------------


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

async function fetchLatestExtractAnchorKeys(args: { supabase: any; sessionId: string; userId: string }) {
  try {
    const { data, error } = await args.supabase
      .from("dream_observation_events")
      .select("anchor_keys, created_at")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .eq("kind", "system_extract")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.warn("fetchLatestExtractAnchorKeys failed", error.message);
      return [];
    }

    const row = (data ?? [])[0] as any;
    return Array.isArray(row?.anchor_keys) ? row.anchor_keys.filter((x: any) => typeof x === "string") : [];
  } catch (e: any) {
    console.warn("fetchLatestExtractAnchorKeys exception", e?.message ?? e);
    return [];
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

    return mapped.filter((row: RecentWorkBlock | null): row is RecentWorkBlock => !!row && Boolean(row.created_at));
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

function buildDirectionProfile(direction: DirectionNormalized): DirectionProfile {
  const method = (direction.method_spec ?? {}) as any;
  const focus = (direction.focus_model ?? {}) as any;
  const stop = (direction.stop_criteria ?? {}) as any;
  const hints = (direction.selection_hints ?? {}) as any;

  // ai_contract jöhet a selection_hints / content alól is – ha nincs, default
  const contract = (hints.ai_contract ?? {}) as any;

  const question_style =
    typeof method.question_style === "string" && method.question_style.trim()
      ? method.question_style.trim()
      : "open_question_single";

  const anchor_policy: AnchorPolicy =
    contract.anchor_policy === "preferred" || contract.anchor_policy === "optional" || contract.anchor_policy === "required"
      ? contract.anchor_policy
      : "required";

  const primary = Array.isArray(focus.primary) ? focus.primary.filter((x: any) => typeof x === "string") : [];
  const secondary = Array.isArray(focus.secondary) ? focus.secondary.filter((x: any) => typeof x === "string") : [];

  const mini_lexicon =
    Array.isArray(contract.mini_lexicon)
      ? contract.mini_lexicon.filter((x: any) => typeof x === "string").slice(0, 10)
      : [];

  return {
    slug: direction.slug,
    title: direction.title,
    micro_description: direction.micro_description,
    ai_contract: {
      role: typeof contract.role === "string" ? contract.role : "guide",
      stance: Array.isArray(contract.stance)
        ? contract.stance.filter((x: any) => typeof x === "string").slice(0, 6)
        : ["non-clinical", "descriptive-only"],
      tone_tags: Array.isArray(contract.tone_tags)
        ? contract.tone_tags.filter((x: any) => typeof x === "string").slice(0, 6)
        : ["gentle", "slow", "minimal-friction"],
      pacing: {
        max_steps: typeof contract?.pacing?.max_steps === "number" ? contract.pacing.max_steps : 4,
        max_depth: typeof contract?.pacing?.max_depth === "number" ? contract.pacing.max_depth : 2,
      },
    },
    question_style,
    focus_model: { primary: primary.slice(0, 6), secondary: secondary.slice(0, 6) },
    anchor_policy,
    stop_criteria: {
      max_cards: typeof stop.max_cards === "number" ? stop.max_cards : undefined,
      stop_if_user_brief_streak: typeof stop.stop_if_user_brief_streak === "number" ? stop.stop_if_user_brief_streak : undefined,
      stop_if_repetition_detected: typeof stop.stop_if_repetition_detected === "boolean" ? stop.stop_if_repetition_detected : undefined,
      stop_if_emotional_overload: typeof stop.stop_if_emotional_overload === "boolean" ? stop.stop_if_emotional_overload : undefined,
    },
    mini_lexicon,
  };
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

function buildBaseSystemPrompt(profile: DirectionProfile, availableAnchors: string[]) {
  const lex = profile.mini_lexicon?.length ? profile.mini_lexicon.join(", ") : "";

  const anchorRules =
    profile.anchor_policy === "required"
      ? availableAnchors.length > 0
        ? `- KÖTELEZŐ: válassz PONTOSAN 1 új horgonyt a listából, és szerepeljen a question-ben: ${availableAnchors.join(
            " | "
          )}`
        : `- NINCS új horgony: add vissza stop_signal.suggest_stop=true és reason="low_novelty".`
      : profile.anchor_policy === "preferred"
        ? availableAnchors.length > 0
          ? `- ELŐNY: használj 1 új horgonyt, ha van: ${availableAnchors.join(" | ")}`
          : `- Ha nincs új horgony, támaszkodhatsz a last_answer_excerpt-re (konkrét részlet!), de maradj az irány stílusában.`
        : `- A horgony opcionális. Elsődleges: az irány stílusa + konkrét jelenet/sorrend/érzékleti fókusz.`;

  return [
    "Magyar nyelvű API vagy, kizárólag a megadott JSON sémát adod vissza.",
    "Szerep: WORK blokkot generálsz: lead_in + question.",
    "",
    "DIRECTION PROFILE (kanonikus):",
    JSON.stringify(profile),
    "",
    "LEAD_IN szabály:",
    "- 2–4 mondat, ráhangolás, NEM kérdés, NEM tartalmaz '?' jelet.",
    "",
    "QUESTION szabály:",
    "- Pontosan 1 mondat (nincs felsorolás, nincs kettőspont/pontosvessző, nincs sortörés).",
    "- VAGY 1 kérdés: pontosan 1 '?' a végén,",
    "- VAGY 1 feladat: 0 '?'",
    "",
    "NEM-ÉRTELMEZÉS:",
    "- Csak megfigyelésekre támaszkodj, nincs jelentés, nincs diagnózis, nincs szimbólumszótár.",
    "",
    "KÖTELEZŐ ILLESZKEDÉS:",
    `- A question a profile.question_style szerint készüljön: ${profile.question_style}`,
    profile.micro_description ? `- Micro leírás: ${profile.micro_description}` : "",
    lex ? `- Mini-szótár (használj belőle finoman): ${lex}` : "",
    "",
    "FORRÁS-PRIORITÁS:",
    "- direction_profile + dream_observation + history az elsődleges.",
    "- Ha nincs új anchor, preferred/optional esetén last_answer_excerpt konkrét részletére támaszkodhatsz.",
    "",
    "ANTI-ISMÉTLÉS:",
    "- Tilos megismételni/parafrazálni a korábbi kérdéseket.",
    "- Ha hasonló lenne: válts más konkrét részletre ugyanabban az irányban.",
    "",
    anchorRules,
    "",
    "Kimenet kizárólag JSON ebben a sémában:",
    '{"work_block":{"lead_in":"","question":"","cta":""},"stop_signal":{"suggest_stop":false,"reason":null},"flags":{"safety":"none"}}',
  ]
    .filter(Boolean)
    .join("\n");
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

    // ✅ after this point, always use sessionIdSafe (string)
    const sessionIdSafe: string = sessionId;
    const directionSlug = direction.slug ?? "unknown";

    const lastAnswer = history.length ? (history[history.length - 1]?.answer ?? "") : "";
    const answerExcerpt = clampExcerpt(lastAnswer, ANSWER_EXCERPT_LIMIT);
    const answerLen = (lastAnswer ?? "").trim().length;

    const shouldFetchRecent = history.length < 2; // ha van folyamat, ne zavarjon promptban

    const [dbLatentPack, observation, recentWorkBlocks, ledgerUsedKeys, extractAnchorKeys] = await Promise.all([
  fetchLatentFromDb({ supabase, sessionId: sessionIdSafe, userId }),
      fetchDreamObservation({ supabase, sessionId: sessionIdSafe, userId }),
      shouldFetchRecent
        ? fetchRecentWorkBlocks({ supabase, sessionId: sessionIdSafe, directionSlug: direction.slug, limit: 3 })
        : Promise.resolve([]),
      fetchUsedAnchorKeysFromLedger({
        supabase,
        sessionId: sessionIdSafe,
        userId,
        directionSlug,
        limit: 80,
        includeAnswered: true,
      }),
      fetchLatestExtractAnchorKeys({ supabase, sessionId: sessionIdSafe, userId }),
    ]);


    const compactObservation = compactDreamObservation(observation);
    const observationAnchors = extractObservationAnchors(observation);

    // Safety gates (hard stop)
    if (safetyFlag !== "none") {
      const out = makeClosureResponse("safety", safetyFlag);
      await appendLatentLogEvent(req, {
        sessionId: sessionIdSafe,
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
        sessionId: sessionIdSafe,
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
        sessionId: sessionIdSafe,
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
    const allowedSlugs = sanitizeAllowedSlugs(body.allowed_slugs, direction.slug);

    const synth = await runLatentSynthesis({
      req,
      sessionId: sessionIdSafe, // ✅ fixed
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

    // OLD (text-level used anchors from prev questions)
    const usedAnchorsByText = extractUsedAnchors(prevQsAll, anchorCandidatesDetailed);

    // NEW: unify used keys:
    // - keys from ledger (direction-scoped)
    // - keys inferred from history (best-effort)
    const usedKeys = new Set<string>(ledgerUsedKeys);
    for (const label of usedAnchorsByText) {
      const k = anchorKey(label);
      if (k) usedKeys.add(k);
    }

    // Available anchors: exclude if its key is used
    const availableAnchors = anchorCandidates.filter((label) => {
      const k = anchorKey(label);
      if (!k) return false;
      return !usedKeys.has(k);
    });

    // --- FORCE NEXT ANCHOR (A3): no anchor_key=null while unused anchor exists ---

function labelForAnchorKey(k: string): string | null {
  const kk = (k ?? "").trim();
  if (!kk) return null;

  // find a label whose normalized anchorKey() matches k
  const match = anchorCandidatesDetailed.find((c) => anchorKey(c.label) === kk);
  return match?.label ?? null;
}

const forcedAnchorKey =
  pickNextAnchorKey({
    extractAnchorKeys,               // e.g. ["balazs","iroda",...]
    usedAnchorKeys: Array.from(usedKeys), // these are normalized keys too
  }) ?? null;

const forcedAnchorLabel = forcedAnchorKey ? labelForAnchorKey(forcedAnchorKey) : null;

// If we have a forced anchor, narrow the available list to ONLY that label
let availableAnchorsFinal = availableAnchors;
if (forcedAnchorLabel) {
  availableAnchorsFinal = [forcedAnchorLabel];
}


    const profile = buildDirectionProfile(direction);
    const baseSystemPrompt = buildBaseSystemPrompt(profile, availableAnchorsFinal);

    const userPayload = {
      dream_text: dreamText,
      direction_profile: profile,
      history,
      prior_echoes: priorEchoes,
      synth: synth ?? null,
      latent_analysis_snapshot: dbLatentPack.latent_analysis ?? null,
      latent_log_tail: dbLatentPack.latent_log_tail ?? [],
      last_answer_excerpt: answerExcerpt,
      available_anchors: availableAnchorsFinal,
      dream_observation: compactObservation,
      // recent_work_blocks: recentWorkBlocks,
      // latent_analysis_snapshot / latent_log_tail: egyelőre ne
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

    // Helper: persist question to ledger (best-effort)
    async function persistAcceptedQuestion(questionText: string) {
      const anchorLabel = forcedAnchorLabel ?? detectAnchorUsed(questionText, anchorCandidatesDetailed);
      const k = forcedAnchorKey ?? (anchorLabel ? anchorKey(anchorLabel) : "");
      const keys = k ? [k] : [];
      // also mark "used" in-memory for this request to reduce weirdness on retry
      for (const kk of keys) usedKeys.add(kk);

      const { id } = await insertLedgerQuestion({
        supabase,
        sessionId: sessionIdSafe, // ✅ fixed
        userId,
        directionSlug,
        questionText,
        questionIntent: profile.question_style ?? null,
        anchorKeys: keys,
      });

      return { anchorLabel, anchorKey: k || null, ledgerId: id };
    }

    // Attempt 1
    const first = await callModel(safetyExtraRules);

    const tooSimilar1 =
      (prevQsRecent.length > 0 && isTooSimilar(first.work_block.question, prevQsRecent)) ||
      isExactRepeat(first.work_block.question, prevQsAll);

    // NEW: if the question uses an anchor key we already asked (ledger), treat as "too similar" even if wording differs
    const anchorLabelFirst = detectAnchorUsed(first.work_block.question, anchorCandidatesDetailed);

// forced módban a forcedAnchorKey az igazság, nem a detectAnchorUsed
const anchorKeyFirstFinal = forcedAnchorKey ?? (anchorLabelFirst ? anchorKey(anchorLabelFirst) : "");

const ledgerRepeat1 = anchorKeyFirstFinal ? usedKeys.has(anchorKeyFirstFinal) : false;

    const violatesForced =
      forcedAnchorLabel ? !normalizeQ(first.work_block.question).includes(normalizeQ(forcedAnchorLabel)) : false;


    if (!tooSimilar1 && !violatesForced && !ledgerRepeat1 && !first.stop_signal?.suggest_stop) {
      const persisted = await persistAcceptedQuestion(first.work_block.question);

      await appendLatentLogEvent(req, {
        sessionId: sessionIdSafe, // ✅ fixed
        event: {
          type: "work_step_generated",
          direction_slug: direction.slug ?? null,
          question: first.work_block.question,
          reason: first.stop_signal?.suggest_stop ? first.stop_signal.reason : null,
          anchor_used: persisted.anchorLabel ?? null,
        },
        meta: {
          source: "work-block/next",
          model: MODEL,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: false,
          ledger_repeat: ledgerRepeat1,
          anchor_key: persisted.anchorKey,
        },
      });

      return NextResponse.json(first);
    }

    // Attempt 2 (retry)
    const retry = await callModel([
      ...safetyExtraRules,
      `TILOS: ezekkel megegyező vagy ezek parafrázisa: ${prevQsRecent.join(" | ")}`,
      forcedAnchorLabel
  ? `KÖTELEZŐ: a question tartalmazza ezt a horgonyt: "${forcedAnchorLabel}".`
  : availableAnchorsFinal.length > 0
    ? `Válassz egy MÁSik horgonyt a listából (elérhető anchors: ${availableAnchorsFinal.join(" | ")}).`
    : `Nincs új horgony, ezért low_novelty lehet a helyes válasz.`
    ]);

    const tooSimilar2 =
      (prevQsRecent.length > 0 && isTooSimilar(retry.work_block.question, prevQsRecent)) ||
      isExactRepeat(retry.work_block.question, prevQsAll);

    const violatesForced2 =
      forcedAnchorLabel ? !normalizeQ(retry.work_block.question).includes(normalizeQ(forcedAnchorLabel)) : false;

    const anchorLabelRetry = detectAnchorUsed(retry.work_block.question, anchorCandidatesDetailed);
const anchorKeyRetryFinal = forcedAnchorKey ?? (anchorLabelRetry ? anchorKey(anchorLabelRetry) : "");
const ledgerRepeat2 = anchorKeyRetryFinal ? usedKeys.has(anchorKeyRetryFinal) : false;

    if (retry.stop_signal?.suggest_stop) {
      await appendLatentLogEvent(req, {
        sessionId: sessionIdSafe, // ✅ fixed
        event: {
          type: "stop_post",
          reason: retry.stop_signal.reason ?? "low_novelty",
          direction_slug: direction.slug ?? null,
          question: retry.work_block.question,
          anchor_used: anchorLabelRetry ?? null,
        },
        meta: {
          source: "work-block/next",
          model: MODEL,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: true,
          ledger_repeat: ledgerRepeat2,
          anchor_key: anchorKeyRetryFinal || null,
        },
      });
      return NextResponse.json(retry);
    }

    if (tooSimilar2 || ledgerRepeat2 || violatesForced2) {
      const out = makeLowNoveltyClosure("none");
      await appendLatentLogEvent(req, {
        sessionId: sessionIdSafe, // ✅ fixed
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
          ledger_repeat: Boolean(ledgerRepeat2),
          note: tooSimilar2 ? "second_try_still_similar" : "second_try_reused_anchor_key",
        },
      });
      return NextResponse.json(out);
    }

    // Accept retry -> persist
    const persistedRetry = await persistAcceptedQuestion(retry.work_block.question);

    await appendLatentLogEvent(req, {
      sessionId: sessionIdSafe, // ✅ fixed
      event: {
        type: "work_step_generated",
        direction_slug: direction.slug ?? null,
        question: retry.work_block.question,
        reason: retry.stop_signal?.suggest_stop ? retry.stop_signal.reason : null,
        anchor_used: persistedRetry.anchorLabel ?? null,
      },
      meta: {
        source: "work-block/next",
        model: MODEL,
        history_count: history.length,
        answer_len: answerLen,
        answer_excerpt: answerExcerpt,
        similarity_retry: true,
        ledger_repeat: false,
        anchor_key: persistedRetry.anchorKey,
      },
    });

    return NextResponse.json(retry);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
