// Modified work-block route for improved latent logging and anchor guidance.
// This version uses the new append_latent_log_event RPC to append log events
// without overwriting the latent_analysis snapshot, and adds a rule to
// encourage selection of a new anchor when revisiting a direction.

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import type { SynthesizeOutput } from "@/app/api/synthesize/route";

// Safety flags returned by synthesize and used by work logic.
const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;

// History and prior echo limits.
const MAX_HISTORY = 8;
const MAX_PRIOR_ECHOES = 2;

// Character limits for generated work blocks.
const LEAD_IN_LIMIT = 720;    // Longer lead_in allowed.
const QUESTION_LIMIT = 180;   // Slightly more permissive.
const CTA_LIMIT = 120;
const BRIEF_ANSWER_LIMIT = 30;

// Similarity thresholds for de-duplication.
const SIMILARITY_THRESHOLD = 0.72;
const RECENT_QS_FOR_SIMILARITY = 6;

// Latent log tail sizes and answer excerpt sizes.
const MAX_LATENT_LOG_TAIL = 6;
const ANSWER_EXCERPT_LIMIT = 120;
// Number of latent log entries to include in the prompt for continuity.
const MAX_LOG_TAIL = 10;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions.
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

type RequestBody = {
  session_id?: string;
  dream_text?: string;
  direction?: DirectionInput;
  history?: HistoryItem[];
  synth?: SynthInput;
  prior_echoes?: PriorEcho[];
  allowed_slugs?: unknown;
};

// Sanitize synthesizer flags into a proper SafetyValue.
function sanitizeSafety(flags?: SynthInput["flags"]): SafetyValue {
  const safety = flags?.safety ?? "none";
  return SAFETY_VALUES.includes(safety as SafetyValue) ? (safety as SafetyValue) : "none";
}

// Basic keyword based safety detection for dream text.
function detectSafety(dreamText: string): SafetyValue {
  const text = dreamText.toLowerCase();
  const selfHarmKeywords = ["suicide", "kill myself", "end my life", "öngyilk", "megölöm magam", "véget vetek", "nem akarok élni"];
  const realityConfusionKeywords = ["can't tell what's real", "not real", "hallucinat", "nem valós", "nem tudom mi a valós", "realitás"];
  if (selfHarmKeywords.some((kw) => text.includes(kw))) return "self_harm";
  if (realityConfusionKeywords.some((kw) => text.includes(kw))) return "reality_confusion";
  return "none";
}

// Clamp history to the most recent MAX_HISTORY entries and normalize fields.
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

// Clamp prior echoes to the most recent MAX_PRIOR_ECHOES and normalize fields.
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

// Normalize allowed slugs list; fallback to the direction slug if needed.
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

// Unwrap a user-supplied direction object into a normalized form.  If neither
// a slug nor any config keys are provided, return null to signal invalid.
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

// Detect repetition in history: last question + answer identical to previous.
function detectRepetition(history: HistoryItem[], stopIfRepetition?: boolean): boolean {
  if (!stopIfRepetition) return false;
  if (history.length < 2) return false;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  return last.question === prev.question && (last.answer ?? "") === (prev.answer ?? "");
}

// Detect a streak of brief answers to decide whether to stop.
function detectUserBriefStreak(history: HistoryItem[], streak?: number): boolean {
  if (!streak || streak <= 0) return false;
  const recent = history.slice(-streak);
  if (recent.length < streak) return false;
  return recent.every((h) => (h.answer ?? "").trim().length <= BRIEF_ANSWER_LIMIT);
}

// Evaluate stop conditions based on direction stop criteria and history.
function shouldStop(direction: DirectionNormalized | undefined, history: HistoryItem[]) {
  const stopCriteria = direction?.stop_criteria ?? {};
  const maxCards = typeof (stopCriteria as any).max_cards === "number" ? (stopCriteria as any).max_cards : undefined;
  if (maxCards && history.length >= maxCards) return { suggest_stop: true, reason: "max_cards" as const };
  if (detectRepetition(history, !!(stopCriteria as any).stop_if_repetition_detected))
    return { suggest_stop: true, reason: "repetition" as const };
  if (detectUserBriefStreak(history, (stopCriteria as any).stop_if_user_brief_streak))
    return { suggest_stop: true, reason: "user_brief_streak" as const };
  return { suggest_stop: false, reason: null as string | null };
}

// Clamp text length to limit.
function clampText(text: string, limit: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

// Clamp each part of a work block to its character limit.
function clampWorkBlock(block: WorkBlock): WorkBlock {
  return {
    lead_in: clampText(block.lead_in, LEAD_IN_LIMIT),
    question: clampText(block.question, QUESTION_LIMIT),
    cta: block.cta ? clampText(block.cta, CTA_LIMIT) : null,
  };
}

// Build a closure work block response with a standard message.
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

// Build a low novelty closure block response.
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

// Clean the lead_in: remove any text after a question mark, if present.
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

// Validate that the question conforms to our UI constraints: a single sentence
// ending in '?' or no question mark, no lists or internal punctuation that
// breaks into multiple sentences.
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

// Sanitize the model output into a WorkBlockResponse or return null on error.
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

// Convert a normalized direction into a structure sent to the model.  We only
// include keys that are present and relevant for question generation.
function buildDirectionForAI(direction: DirectionNormalized | undefined) {
  if (!direction) return undefined;
  const methodSpec = direction.method_spec ?? {};
  const methodSpecForAI: Record<string, unknown> = {};
  if (typeof (methodSpec as any)?.question_style === "string") methodSpecForAI.question_style = (methodSpec as any).question_style;
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

// Helpers for similarity detection.
function normalizeQ(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenSet(s: string) {
  const stop = new Set(["a","az","és","hogy","de","ha","is","nem","mi","mit","most","itt","volt","van","lesz","egy","egyik","melyik","milyen","szerint","inkább","kicsit","hogyan","amikor","ami","azt"]);
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

// Attempt to parse JSON returned from the model, with fallback to salvage partial.
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

// Call synthesize route to generate latent anchors, candidate directions and seed.
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

// ────────────────────────────────────────────────────────────────────────────────
// Latent log read + work append log (new RPC)
// ────────────────────────────────────────────────────────────────────────────────

function safeArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

function clampExcerpt(s: string, limit: number) {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > limit ? t.slice(0, limit) : t;
}

// Build a compact tail from the latent log, only including metadata needed for
// non-repeat enforcement.  The tail size is limited to MAX_LATENT_LOG_TAIL.
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
      answer_len: typeof meta?.answer_len === "number" ? meta.answer_len : null,
      stop_reason: typeof ev?.reason === "string" ? ev.reason : null,
    };
  });
}

// Fetch latent_analysis and latent_analysis_log from the DB and return a tail.
async function fetchLatentFromDb(args: {
  supabase: any;
  sessionId: string;
  userId: string;
}) {
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

// Append a work event to the latent_analysis_log using the new RPC.  The event
// describes what happened (e.g. type, direction, question) and meta contains
// auxiliary data such as the model used.
async function appendLatentLogEvent(req: Request, args: {
  sessionId: string;
  event: Record<string, unknown>;
  meta: Record<string, unknown>;
}) {
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

// The main POST handler: generate the next work block for a given session/direction.
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

    // Compute last answer excerpt for prompt context and meta logging.
    const lastAnswer = history.length ? (history[history.length - 1]?.answer ?? "") : "";
    const answerExcerpt = clampExcerpt(lastAnswer, ANSWER_EXCERPT_LIMIT);
    const answerLen = (lastAnswer ?? "").trim().length;

    // Read latent analysis snapshot and log tail for prompt continuity.
    const dbLatentPack = await fetchLatentFromDb({ supabase, sessionId, userId });

    // Pre-safety gate: stop immediately on explicit safety flags or detection.
    if (safetyFlag !== "none") {
      const out = makeClosureResponse("safety", safetyFlag);
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "stop_pre",
          reason: "safety",
          direction_slug: direction.slug ?? null,
        },
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
        event: {
          type: "stop_pre",
          reason: "safety",
          direction_slug: direction.slug ?? null,
        },
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

    // Stop if direction's max cards, repetition or brief streak reached.
    const stopSignal = shouldStop(direction, history);
    if (stopSignal.suggest_stop) {
      const out = makeClosureResponse(stopSignal.reason, safetyFlag);
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "stop_pre",
          reason: stopSignal.reason,
          direction_slug: direction.slug ?? null,
        },
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

    // Build direction spec for the AI.
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

    // System prompt with additional guidance to select a new anchor when repeating.
    const baseSystemPrompt = [
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
      "- Ha van synth.anchors vagy latent_log_tail, válassz olyan anchor-t, ami eddig még NEM volt fókuszban ugyanebben az irányban.",
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
      "{\"work_block\":{\"lead_in\":\"\",\"question\":\"\",\"cta\":\"\"},\"stop_signal\":{\"suggest_stop\":false,\"reason\":null},\"flags\":{\"safety\":\"none\"}}",
    ].join("\n");

    // Build the user payload for the model with extra context: latent snapshot,
    // latent log tail and last answer excerpt.
    const userPayload = {
      dream_text: dreamText,
      direction: directionForAI ?? {},
      history,
      prior_echoes: priorEchoes,
      synth: synth ?? null,
      latent_analysis_snapshot: dbLatentPack.latent_analysis ?? null,
      latent_log_tail: dbLatentPack.latent_log_tail ?? [],
      last_answer_excerpt: answerExcerpt,
    };

    // Helper to call the model with optional extra rules appended to the system prompt.
    async function callModel(extraRules: string[] = []) {
      const systemPrompt = [baseSystemPrompt, ...extraRules].join("\n");
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.35,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        max_tokens: 650,
      });
      const rawContent = completion.choices?.[0]?.message?.content ?? "";
      const parsed = await parseModelJSON(rawContent);
      const sanitized = validateModelOutput(parsed);
      if (!sanitized) throw new Error("Invalid model output");
      return sanitized;
    }

    // First attempt: generate a work block.
    const first = await callModel();
    const tooSimilar1 =
      (prevQsRecent.length > 0 && isTooSimilar(first.work_block.question, prevQsRecent)) ||
      isExactRepeat(first.work_block.question, prevQsAll);
    if (!tooSimilar1) {
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "work_step_generated",
          direction_slug: direction.slug ?? null,
          question: first.work_block.question,
          reason: first.stop_signal?.suggest_stop ? first.stop_signal.reason : null,
        },
        meta: {
          source: "work-block/next",
          model: "gpt-4o-mini",
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: false,
        },
      });
      return NextResponse.json(first);
    }

    // Retry with stricter anti-repeat rules if the first question is too similar.
    const retry = await callModel([
      `TILOS: ezekkel megegyező vagy ezek parafrázisa: ${prevQsRecent.join(" | ")}`,
      "Ha van synth.anchors és/vagy latent_log_tail, válassz olyan konkrét fókuszt (szereplő/helyszín/tárgy/testérzet), ami eddig még nem volt fókuszban ugyanabban az irányban.",
      "KÖTELEZŐ: válts teljesen más konkrét részletre ugyanabban az irányban.",
      "Ha nem tudsz érdemben új fókuszt, add vissza a sémát úgy, hogy stop_signal.suggest_stop=true és reason='low_novelty'.",
    ]);

    const tooSimilar2 =
      (prevQsRecent.length > 0 && isTooSimilar(retry.work_block.question, prevQsRecent)) ||
      isExactRepeat(retry.work_block.question, prevQsAll);
    if (retry.stop_signal?.suggest_stop) {
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "stop_post",
          reason: retry.stop_signal.reason ?? "low_novelty",
          direction_slug: direction.slug ?? null,
          question: retry.work_block.question,
        },
        meta: {
          source: "work-block/next",
          model: "gpt-4o-mini",
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          similarity_retry: true,
        },
      });
      return NextResponse.json(retry);
    }
    if (tooSimilar2) {
      const out = makeLowNoveltyClosure(safetyFlag);
      await appendLatentLogEvent(req, {
        sessionId,
        event: {
          type: "stop_post",
          reason: "low_novelty",
          direction_slug: direction.slug ?? null,
        },
        meta: {
          source: "work-block/next",
          model: "gpt-4o-mini",
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
      },
      meta: {
        source: "work-block/next",
        model: "gpt-4o-mini",
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