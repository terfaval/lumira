// /app/api/work-block/next/route.ts //

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import type { SynthesizeOutput } from "@/app/api/synthesize/route";

const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;

const MAX_HISTORY = 8;
const MAX_PRIOR_ECHOES = 2;

const LEAD_IN_LIMIT = 720; // ✅ hosszabb lead_in
const QUESTION_LIMIT = 180; // picit engedékenyebb
const CTA_LIMIT = 120;
const BRIEF_ANSWER_LIMIT = 30;

const SIMILARITY_THRESHOLD = 0.72;
const RECENT_QS_FOR_SIMILARITY = 6;

// ✅ latent log (prompt + audit)
const MAX_LATENT_LOG_TAIL = 6;
const ANSWER_EXCERPT_LIMIT = 120;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function sanitizeSafety(flags?: SynthInput["flags"]): SafetyValue {
  const safety = flags?.safety ?? "none";
  return SAFETY_VALUES.includes(safety as SafetyValue) ? (safety as SafetyValue) : "none";
}

function detectSafety(dreamText: string): SafetyValue {
  const text = dreamText.toLowerCase();
  const selfHarmKeywords = ["suicide", "kill myself", "end my life", "öngyilk", "megölöm magam", "véget vetek", "nem akarok élni"];
  const realityConfusionKeywords = ["can't tell what's real", "not real", "hallucinat", "nem valós", "nem tudom mi a valós", "realitás"];

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
  if (detectRepetition(history, !!(stopCriteria as any).stop_if_repetition_detected))
    return { suggest_stop: true, reason: "repetition" as const };
  if (detectUserBriefStreak(history, (stopCriteria as any).stop_if_user_brief_streak))
    return { suggest_stop: true, reason: "user_brief_streak" as const };

  return { suggest_stop: false, reason: null as string | null };
}

function clampText(text: string, limit: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
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

// lead_in tisztítás: ne kerülhessen kérdés az átvezetőbe
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

// question: 1 mondat, kérdés (1 ?) vagy feladat (0 ?), nincs lista/kettőspont/pontosvessző, nincs sortörés
function isSingleSentencePrompt(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if ((t.match(/\n/g) ?? []).length > 0) return false;

  const qCount = (t.match(/\?/g) ?? []).length;
  if (qCount > 1) return false;

  // ha kérdés, legyen a végén '?'
  if (qCount === 1 && !t.endsWith("?")) return false;

  // egy mondat: ne legyen benne belső '.' vagy '!' (kérdésnél a '?' a végén ok)
  const inner = t.endsWith("?") ? t.slice(0, -1) : t;
  if (/[.!]/.test(inner)) return false;

  // UI-törők
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

// similarity helpers (maradnak)
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

// ✅ synthesize: most már VISSZA is olvassuk
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
// ✅ Latent log read + work append log
// ────────────────────────────────────────────────────────────────────────────────

function safeArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

function clampExcerpt(s: string, limit: number) {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > limit ? t.slice(0, limit) : t;
}

function buildLatentLogTail(log: any, limit = MAX_LATENT_LOG_TAIL) {
  const arr = safeArray(log)
    .map((e) => (e && typeof e === "object" ? e : null))
    .filter(Boolean) as any[];

  const tail = arr.slice(-limit);

  // csak egy kompakt kivonatot adunk a promptba
  return tail.map((e) => {
    const meta = e?.meta && typeof e.meta === "object" ? e.meta : {};
    return {
      ts: typeof e?.ts === "string" ? e.ts : null,
      source: typeof meta?.source === "string" ? meta.source : null,
      event: typeof meta?.event === "string" ? meta.event : null,
      direction_slug: typeof meta?.direction_slug === "string" ? meta.direction_slug : null,
      question: typeof meta?.question === "string" ? meta.question : null,
      answer_len: typeof meta?.answer_len === "number" ? meta.answer_len : null,
      stop_reason: typeof meta?.stop_reason === "string" ? meta.stop_reason : null,
    };
  });
}

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

async function appendWorkLog(req: Request, args: {
  sessionId: string;
  meta: Record<string, unknown>;
}) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    // ✅ p_output = null → csak log, snapshotot nem bántjuk (DB patch kell hozzá)
    const { error } = await supabase.rpc("append_latent_analysis", {
      p_session_id: args.sessionId,
      p_output: null,
      p_meta: args.meta,
    });

    if (error) console.warn("append_latent_analysis(work) failed", error.message);
  } catch (e: any) {
    console.warn("appendWorkLog exception", e?.message ?? e);
  }
}

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

    // ✅ DB latent + log tail (work memóriának)
    const dbLatentPack = await fetchLatentFromDb({ supabase, sessionId, userId });

    // safety gate
    if (safetyFlag !== "none") {
      const out = makeClosureResponse("safety", safetyFlag);
      await appendWorkLog(req, {
        sessionId,
        meta: {
          source: "work",
          event: "stop_pre",
          stop_reason: "safety",
          safety: safetyFlag,
          direction_slug: direction.slug ?? null,
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
      await appendWorkLog(req, {
        sessionId,
        meta: {
          source: "work",
          event: "stop_pre",
          stop_reason: "safety",
          safety: detectedSafety,
          direction_slug: direction.slug ?? null,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
        },
      });
      return NextResponse.json(out);
    }

    const stopSignal = shouldStop(direction, history);
    if (stopSignal.suggest_stop) {
      const out = makeClosureResponse(stopSignal.reason, safetyFlag);
      await appendWorkLog(req, {
        sessionId,
        meta: {
          source: "work",
          event: "stop_pre",
          stop_reason: stopSignal.reason,
          safety: safetyFlag,
          direction_slug: direction.slug ?? null,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
        },
      });
      return NextResponse.json(out);
    }

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
      "- Tilos ismételni/újrafogalmazni a korábbi kérdéseket; kerüld az ugyanoda vezető fókuszt is.",
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

    const userPayload = {
      dream_text: dreamText,
      direction: directionForAI ?? {},
      history,
      prior_echoes: priorEchoes,
      synth: synth ?? null,

      // ✅ prompt extra context
      latent_analysis_snapshot: dbLatentPack.latent_analysis ?? null,
      latent_log_tail: dbLatentPack.latent_log_tail ?? [],
      last_answer_excerpt: answerExcerpt,
    };

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

    // 1) first try
    const first = await callModel();

    const tooSimilar1 =
      (prevQsRecent.length > 0 && isTooSimilar(first.work_block.question, prevQsRecent)) ||
      isExactRepeat(first.work_block.question, prevQsAll);

    if (!tooSimilar1) {
      await appendWorkLog(req, {
        sessionId,
        meta: {
          source: "work",
          event: "work_step_generated",
          direction_slug: direction.slug ?? null,
          question: first.work_block.question,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          stop_reason: first.stop_signal?.suggest_stop ? first.stop_signal.reason : null,
          similarity_retry: false,
        },
      });
      return NextResponse.json(first);
    }

    // 2) retry
    const retry = await callModel([
      `TILOS: ezekkel megegyező vagy ezek parafrázisa: ${prevQsRecent.join(" | ")}`,
      "KÖTELEZŐ: válts teljesen más konkrét részletre (szereplő/helyszín/tárgy/jelenetváltás/testérzet), de maradj az irány keretében.",
      "Ha nem tudsz érdemben új fókuszt, add vissza a sémát úgy, hogy stop_signal.suggest_stop=true és reason='low_novelty'.",
    ]);

    const tooSimilar2 =
      (prevQsRecent.length > 0 && isTooSimilar(retry.work_block.question, prevQsRecent)) ||
      isExactRepeat(retry.work_block.question, prevQsAll);

    if (retry.stop_signal?.suggest_stop) {
      await appendWorkLog(req, {
        sessionId,
        meta: {
          source: "work",
          event: "stop_post",
          direction_slug: direction.slug ?? null,
          question: retry.work_block.question,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          stop_reason: retry.stop_signal.reason ?? "low_novelty",
          similarity_retry: true,
        },
      });
      return NextResponse.json(retry);
    }

    if (tooSimilar2) {
      const out = makeLowNoveltyClosure(safetyFlag);
      await appendWorkLog(req, {
        sessionId,
        meta: {
          source: "work",
          event: "stop_post",
          direction_slug: direction.slug ?? null,
          history_count: history.length,
          answer_len: answerLen,
          answer_excerpt: answerExcerpt,
          stop_reason: "low_novelty",
          similarity_retry: true,
          note: "second_try_still_similar",
        },
      });
      return NextResponse.json(out);
    }

    await appendWorkLog(req, {
      sessionId,
      meta: {
        source: "work",
        event: "work_step_generated",
        direction_slug: direction.slug ?? null,
        question: retry.work_block.question,
        history_count: history.length,
        answer_len: answerLen,
        answer_excerpt: answerExcerpt,
        stop_reason: retry.stop_signal?.suggest_stop ? retry.stop_signal.reason : null,
        similarity_retry: true,
      },
    });

    return NextResponse.json(retry);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
