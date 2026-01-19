// /app/api/work-block/next/route.ts (v0)
// Minimal, non-legacy work block generator.
// - NO dream_session_summaries
// - NO dream_observation / events
// - NO work_blocks
// - NO latent RPC logging
// - Optional anchor forcing via extract_anchor_keys + pickNextAnchorKey
//
// Input is authoritative: dream_text + direction + history (+ optional anchors).
// Output: { work_block, stop_signal, flags }

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { pickNextAnchorKey } from "@/src/lib/dream/pickNextAnchorKey";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SAFETY_VALUES = ["none", "distress", "self_harm", "reality_confusion", "other"] as const;

const MAX_HISTORY = 8;

const LEAD_IN_LIMIT = 720;
const QUESTION_LIMIT = 180;
const CTA_LIMIT = 120;
const BRIEF_ANSWER_LIMIT = 30;

const SIMILARITY_THRESHOLD = 0.65;
const MIN_SIM_TOKENS = 5;
const RECENT_QS_FOR_SIMILARITY = 6;

const OPENAI_TIMEOUT_MS = 15000;
const MODEL = "gpt-4o-mini";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SafetyValue = (typeof SAFETY_VALUES)[number];

type HistoryItem = { question: string; answer: string | null };

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
  allowed_slugs?: unknown;
  // v0 extras:
  anchors?: unknown; // optional string[]
  extract_anchor_keys?: unknown; // optional string[]
};

// AnchorPolicy is kept but simplified: we only enforce "required" if we have anchors.
type AnchorPolicy = "required" | "preferred" | "optional";

type DirectionProfile = {
  slug?: string;
  title?: string;
  micro_description?: string;
  ai_contract: {
    role: string;
    stance: string[];
    tone_tags: string[];
    pacing: { max_steps: number; max_depth: number };
  };
  question_style: string;
  focus_model: { primary: string[]; secondary: string[] };
  anchor_policy: AnchorPolicy;
  stop_criteria: {
    max_cards?: number;
    stop_if_user_brief_streak?: number;
    stop_if_repetition_detected?: boolean;
    stop_if_emotional_overload?: boolean;
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

function sanitizeStringArray(x: unknown, limit = 30): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit);
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
      lead_in: "Köszönöm, hogy megosztottad. Itt most megpihenhetünk, vagy válthatsz irányt.",
      question: "Szeretnél irányt váltani, vagy most pihenni és később folytatni?",
      cta: null,
    }),
    stop_signal: { suggest_stop: true, reason },
    flags: { safety },
  };
}

function makeLowNoveltyClosure(safety: SafetyValue): WorkBlockResponse {
  return {
    work_block: clampWorkBlock({
      lead_in: "Ebben az irányban most nem látok új, érdemi fókuszt — válthatunk irányt.",
      question: "Váltunk irányt, vagy most pihensz meg?",
      cta: null,
    }),
    stop_signal: { suggest_stop: true, reason: "low_novelty" },
    flags: { safety },
  };
}

function cleanLeadIn(leadIn: string): string {
  const t = (leadIn ?? "").trim();
  if (!t) return "";
  // lead_in should not contain '?'
  if (t.includes("?")) return t.replace(/\?/g, "").trim();
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

function isTooSimilar(newQ: string, prevQs: string[], threshold = 0.65) {
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
// Anchor key normalisation (ledger)
// -----------------------------------------------------------------------------

const HU_STOP = new Set([
  "a","az","egy","és","vagy","hogy","de","mert","amikor","ahogy","már","még","is","se","sem","ott","itt","oda","ide","innen","onnan","valami","valaki","nagyon","kicsit",
]);

function stripDiacritics(s: string) {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function anchorKey(raw: string): string {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "";
  const tokens = stripDiacritics(s)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 2)
    .filter((t) => !HU_STOP.has(t));
  return tokens.join(" ");
}

// -----------------------------------------------------------------------------
// Ledger helpers (v0 table)
// -----------------------------------------------------------------------------

async function fetchUsedAnchorKeysFromLedger(args: {
  supabase: any;
  sessionId: string;
  userId: string;
  directionSlug?: string;
  limit?: number;
}): Promise<Set<string>> {
  const used = new Set<string>();
  try {
    let q = args.supabase
      .from("work_question_ledger")
      .select("anchor_keys, created_at")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 80);

    if (args.directionSlug) q = q.eq("direction_slug", args.directionSlug);

    const { data, error } = await q;
    if (error) return used;

    for (const row of data ?? []) {
      const keys = (row as any)?.anchor_keys;
      if (Array.isArray(keys)) for (const k of keys) if (typeof k === "string" && k.trim()) used.add(k.trim());
    }
    return used;
  } catch {
    return used;
  }
}

async function insertLedgerQuestion(args: {
  supabase: any;
  sessionId: string;
  userId: string;
  directionSlug?: string;
  questionText: string;
  questionIntent?: string | null;
  anchorKeys: string[];
}) {
  try {
    await args.supabase.from("work_question_ledger").insert({
      session_id: args.sessionId,
      user_id: args.userId,
      direction_slug: args.directionSlug ?? "unknown",
      question_text: args.questionText,
      question_intent: args.questionIntent ?? null,
      anchor_keys: args.anchorKeys,
    });
  } catch {
    // best-effort
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
      pacing: { max_steps: 999, max_depth: 99 },
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
  if (detectRepetition(history, !!(stopCriteria as any).stop_if_repetition_detected)) {
    return { suggest_stop: true, reason: "repetition" as const };
  }
  if (detectUserBriefStreak(history, (stopCriteria as any).stop_if_user_brief_streak)) {
    return { suggest_stop: true, reason: "user_brief_streak" as const };
  }
  return { suggest_stop: false, reason: null as string | null };
}

// -----------------------------------------------------------------------------
// Prompt construction (v0)
// -----------------------------------------------------------------------------

function buildBaseSystemPrompt(profile: DirectionProfile, availableAnchors: string[], forcedAnchorLabel?: string | null) {
  const lex = profile.mini_lexicon?.length ? profile.mini_lexicon.join(", ") : "";

  const anchorRules =
    forcedAnchorLabel
      ? `- KÖTELEZŐ: a question tartalmazza ezt a horgonyt: "${forcedAnchorLabel}".`
      : profile.anchor_policy === "required"
        ? availableAnchors.length > 0
          ? `- KÖTELEZŐ: válassz PONTOSAN 1 új horgonyt a listából, és szerepeljen a question-ben: ${availableAnchors.join(" | ")}`
          : `- NINCS új horgony: add vissza stop_signal.suggest_stop=true és reason="low_novelty".`
        : profile.anchor_policy === "preferred"
          ? availableAnchors.length > 0
            ? `- ELŐNY: használj 1 új horgonyt, ha van: ${availableAnchors.join(" | ")}`
            : `- Ha nincs új horgony, támaszkodhatsz a legutóbbi válasz konkrét részletére, de ne ismételj kérdést.`
          : `- A horgony opcionális.`;

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
    "- Nincs szimbólum-értelmezés, nincs diagnózis, nincs terápiás állítás.",
    "- Csak a megadott szöveg + a user válaszai alapján kérdezz rá konkrét részletre.",
    "",
    "KÖTELEZŐ ILLESZKEDÉS:",
    `- A question a profile.question_style szerint készüljön: ${profile.question_style}`,
    profile.micro_description ? `- Micro leírás: ${profile.micro_description}` : "",
    lex ? `- Mini-szótár (használj belőle finoman): ${lex}` : "",
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

async function callModel(args: {
  systemPrompt: string;
  userPayload: any;
}): Promise<WorkBlockResponse> {
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
              { role: "system", content: args.systemPrompt },
              { role: "user", content: JSON.stringify(args.userPayload) },
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
    const safetyFlag = sanitizeSafety(body.synth?.flags);

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    if (!direction) return NextResponse.json({ error: "Missing direction" }, { status: 400 });
    if (!dreamText) return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });

    const sessionIdSafe = sessionId;
    const directionSlug = direction.slug ?? "unknown";

    // Safety gates
    if (safetyFlag !== "none") return NextResponse.json(makeClosureResponse("safety", safetyFlag));
    const detectedSafety = detectSafety(dreamText);
    if (detectedSafety !== "none") return NextResponse.json(makeClosureResponse("safety", detectedSafety));

    // Stop criteria
    const stopSignal = shouldStop(direction, history);
    if (stopSignal.suggest_stop) return NextResponse.json(makeClosureResponse(stopSignal.reason, "none"));

    // Anchors: from payload only (v0)
    const anchors = sanitizeStringArray(body.anchors, 40);
    const extractAnchorKeys = sanitizeStringArray(body.extract_anchor_keys, 60);

    // Ledger used keys
    const ledgerUsedKeys = await fetchUsedAnchorKeysFromLedger({
      supabase,
      sessionId: sessionIdSafe,
      userId,
      directionSlug,
      limit: 120,
    });

    // Available anchors exclude ledger-used keys
    const availableAnchors = anchors.filter((label) => {
      const k = anchorKey(label);
      return k && !ledgerUsedKeys.has(k);
    });

    // Forced anchor key -> label
    function labelForAnchorKey(k: string): string | null {
      const kk = (k ?? "").trim();
      if (!kk) return null;
      const match = anchors.find((a) => anchorKey(a) === kk);
      return match ?? null;
    }

    const forcedAnchorKey =
      pickNextAnchorKey({
        extractAnchorKeys,
        usedAnchorKeys: Array.from(ledgerUsedKeys),
      }) ?? null;

    const forcedAnchorLabel = forcedAnchorKey ? labelForAnchorKey(forcedAnchorKey) : null;

    const profile = buildDirectionProfile(direction);
    const allowedSlugs = sanitizeAllowedSlugs(body.allowed_slugs, direction.slug);

    const prevQsAll = history.map((h) => h.question).filter(Boolean);
    const prevQsRecent = prevQsAll.slice(-RECENT_QS_FOR_SIMILARITY);

    const systemPrompt = buildBaseSystemPrompt(profile, availableAnchors, forcedAnchorLabel);

    const userPayload = {
      session_id: sessionIdSafe,
      direction_slug: directionSlug,
      allowed_slugs: allowedSlugs,
      dream_text: dreamText,
      history,
      available_anchors: forcedAnchorLabel ? [forcedAnchorLabel] : availableAnchors,
    };

    // Attempt 1
    const first = await callModel({ systemPrompt, userPayload });

    const tooSimilar1 =
      (prevQsRecent.length > 0 && isTooSimilar(first.work_block.question, prevQsRecent, SIMILARITY_THRESHOLD)) ||
      isExactRepeat(first.work_block.question, prevQsAll);

    const violatesForced1 =
      forcedAnchorLabel
        ? !normalizeQ(first.work_block.question).includes(normalizeQ(forcedAnchorLabel))
        : false;

    if (!first.stop_signal?.suggest_stop && !tooSimilar1 && !violatesForced1) {
      const k = forcedAnchorKey ?? (forcedAnchorLabel ? anchorKey(forcedAnchorLabel) : "");
      const keys = k ? [k] : [];
      await insertLedgerQuestion({
        supabase,
        sessionId: sessionIdSafe,
        userId,
        directionSlug,
        questionText: first.work_block.question,
        questionIntent: profile.question_style ?? null,
        anchorKeys: keys,
      });
      return NextResponse.json(first);
    }

    // Attempt 2 (harder anti-repeat)
    const retry = await callModel({
      systemPrompt:
        systemPrompt +
        `\nTILOS: ezekkel megegyező vagy ezek parafrázisa: ${prevQsRecent.join(" | ")}`,
      userPayload,
    });

    const tooSimilar2 =
      (prevQsRecent.length > 0 && isTooSimilar(retry.work_block.question, prevQsRecent, SIMILARITY_THRESHOLD)) ||
      isExactRepeat(retry.work_block.question, prevQsAll);

    const violatesForced2 =
      forcedAnchorLabel
        ? !normalizeQ(retry.work_block.question).includes(normalizeQ(forcedAnchorLabel))
        : false;

    if (retry.stop_signal?.suggest_stop) return NextResponse.json(retry);
    if (tooSimilar2 || violatesForced2) return NextResponse.json(makeLowNoveltyClosure("none"));

    const k2 = forcedAnchorKey ?? (forcedAnchorLabel ? anchorKey(forcedAnchorLabel) : "");
    const keys2 = k2 ? [k2] : [];
    await insertLedgerQuestion({
      supabase,
      sessionId: sessionIdSafe,
      userId,
      directionSlug,
      questionText: retry.work_block.question,
      questionIntent: profile.question_style ?? null,
      anchorKeys: keys2,
    });

    return NextResponse.json(retry);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
