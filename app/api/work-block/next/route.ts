import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;
const MAX_HISTORY = 4;
const MAX_PRIOR_ECHOES = 2;
const LEAD_IN_LIMIT = 280;
const QUESTION_LIMIT = 160;
const CTA_LIMIT = 120;
const BRIEF_ANSWER_LIMIT = 30;

// low novelty
const SIMILARITY_THRESHOLD = 0.72; // 0.68–0.78 között érdemes hangolni
const RECENT_QS_FOR_SIMILARITY = 2;

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
  catalog?: unknown;
  allowed_slugs?: unknown;
};

function sanitizeSafety(flags?: SynthInput["flags"]): SafetyValue {
  const safety = flags?.safety ?? "none";
  return SAFETY_VALUES.includes(safety as SafetyValue) ? (safety as SafetyValue) : "none";
}

function detectSafety(dreamText: string): SafetyValue {
  const text = dreamText.toLowerCase();
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

function sanitizeAllowedSlugs(allowed: unknown, fallbackSlug?: string): string[] {
  if (Array.isArray(allowed)) {
    return allowed
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  if (fallbackSlug && typeof fallbackSlug === "string" && fallbackSlug.trim()) {
    return [fallbackSlug.trim()];
  }

  return [];
}

function unwrapDirection(direction: DirectionInput | undefined | null): DirectionNormalized | null {
  if (!direction || typeof direction !== "object") return null;

  const asRecord = (val: unknown) =>
    val && typeof val === "object" ? (val as Record<string, unknown>) : undefined;

  const content = asRecord((direction as any).content) ?? asRecord(direction);

  const methodSpec = (asRecord(content?.method_spec) ?? asRecord((direction as any).method_spec)) ?? undefined;
  const stopCriteria = asRecord(content?.stop_criteria) ?? asRecord((direction as any).stop_criteria) ?? undefined;
  const outputSpec = asRecord(content?.output_spec) ?? asRecord((direction as any).output_spec) ?? undefined;
  const safety = asRecord(content?.safety) ?? asRecord((direction as any).safety) ?? undefined;
  const focusModel = asRecord(content?.focus_model) ?? asRecord((direction as any).focus_model) ?? undefined;
  const selectionHints =
    asRecord(content?.selection_hints) ?? asRecord((direction as any).selection_hints) ?? undefined;

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

function shouldStop(
  direction: DirectionNormalized | undefined,
  history: HistoryItem[]
): { suggest_stop: boolean; reason: string | null } {
  const stopCriteria = direction?.stop_criteria ?? {};
  const maxCards = typeof stopCriteria.max_cards === "number" ? stopCriteria.max_cards : undefined;

  if (maxCards && history.length >= maxCards) return { suggest_stop: true, reason: "max_cards" };
  if (detectRepetition(history, !!stopCriteria.stop_if_repetition_detected))
    return { suggest_stop: true, reason: "repetition" };
  if (detectUserBriefStreak(history, stopCriteria.stop_if_user_brief_streak as number | undefined))
    return { suggest_stop: true, reason: "user_brief_streak" };

  return { suggest_stop: false, reason: null };
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

// ✅ low-novelty sablon lezárás
function makeLowNoveltyClosure(safety: SafetyValue): WorkBlockResponse {
  return {
    work_block: clampWorkBlock({
      lead_in:
        "Ebben az irányban most nem látok több olyan érdemi, új kérdést, ami valóban hozzáadna a feldolgozáshoz. Ezért ezt az irányt most lezárjuk.",
      question: "Hogyan szeretnéd folytatni?",
      cta: null,
    }),
    stop_signal: { suggest_stop: true, reason: "low_novelty" },
    flags: { safety },
  };
}

function validateModelOutput(parsed: unknown): WorkBlockResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, any>;
  const workBlock = obj.work_block ?? {};
  const stopSignal = obj.stop_signal ?? {};
  const flags = obj.flags ?? {};

  if (!workBlock || typeof workBlock !== "object") return null;

  const question = typeof workBlock.question === "string" ? workBlock.question.trim() : "";
  if (!question) return null;

  const leadIn = typeof workBlock.lead_in === "string" ? workBlock.lead_in : "";
  const cta = typeof workBlock.cta === "string" ? workBlock.cta : null;

  const questionMarkCount = (question.match(/\?/g) ?? []).length;
  const hasNumberedList = /\d+\)/.test(question);
  const lineBreakCount = (question.match(/\n/g) ?? []).length;

  if (questionMarkCount > 1 || hasNumberedList || lineBreakCount >= 2) return null;

  const suggestStop = Boolean(stopSignal?.suggest_stop);
  const reason = typeof stopSignal?.reason === "string" ? stopSignal.reason : null;

  const safety = SAFETY_VALUES.includes(flags?.safety as SafetyValue)
    ? (flags.safety as SafetyValue)
    : "none";

  return {
    work_block: clampWorkBlock({ lead_in: leadIn, question, cta }),
    stop_signal: { suggest_stop: suggestStop, reason },
    flags: { safety },
  };
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

// ---------- similarity helpers (low novelty) ----------
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

async function runLatentSynthesisSidecar(args: {
  req: Request;
  body: RequestBody;
  dreamText: string;
  direction: DirectionNormalized | null;
  history: HistoryItem[];
  priorEchoes: PriorEcho[];
}) {
  const sessionId = typeof args.body.session_id === "string" ? args.body.session_id : undefined;
  if (!sessionId) return;

  const allowedSlugs = sanitizeAllowedSlugs(args.body.allowed_slugs, args.direction?.slug);

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
        session_id: sessionId,
        dream_text: args.dreamText,
        history: args.history,
        prior_echoes: args.priorEchoes,
        catalog: args.body.catalog ?? null,
        allowed_slugs: allowedSlugs,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("synthesize sidecar non-OK", res.status, text.slice(0, 400));
    }
  } catch (err) {
    console.warn("synthesize sidecar failed", err);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as RequestBody;

    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
    const dreamText = (body.dream_text ?? "").trim();
    const direction = unwrapDirection(body.direction as DirectionInput);
    const history = sanitizeHistory(body.history);
    const previousQuestion = history[history.length - 1]?.question ?? "";
    const priorEchoes = sanitizePriorEchoes(body.prior_echoes);
    const safetyFlag = sanitizeSafety(body.synth?.flags);

    if (!dreamText) return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });
    if (!direction) return NextResponse.json({ error: "Missing direction" }, { status: 400 });
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    await runLatentSynthesisSidecar({
      req,
      body,
      dreamText,
      direction,
      history,
      priorEchoes,
    });

    if (safetyFlag !== "none") return NextResponse.json(makeClosureResponse("safety", safetyFlag));

    const detectedSafety = detectSafety(dreamText);
    if (detectedSafety !== "none") return NextResponse.json(makeClosureResponse("safety", detectedSafety));

    const stopSignal = shouldStop(direction, history);
    if (stopSignal.suggest_stop) return NextResponse.json(makeClosureResponse(stopSignal.reason, safetyFlag));

    const directionForAI = buildDirectionForAI(direction);

    const userPayload = {
      dream_text: dreamText,
      direction: directionForAI ?? {},
      history,
      previous_question: previousQuestion,
      prior_echoes: priorEchoes,
    };

    const baseSystemPrompt = [
      "Magyar nyelvű API vagy, kizárólag a megadott JSON sémát adod vissza.",
      "Szerep: a következő kártyára egyetlen, irányhoz illeszkedő kérdést generálsz.",
      "",
      "KÖTELEZŐ ILLESZKEDÉS AZ IRÁNYHOZ:",
      "- A direction.method_spec.question_style szerint formáld a kérdést.",
      "- Használd a direction.micro_description + focus_model + selection_hints elemeit.",
      "",
      "ANTI-GENERIKUS SZABÁLY:",
      "- A kérdésben legyen legalább 1 konkrét horgony a dream_text-ből VAGY a legutóbbi answer-ből.",
      "- Ne kérdezz általánosan horgony nélkül.",
      "",
      "ISMÉTLÉS ELLEN:",
      "- Ne ismételd a previous_question-t és ne parafrazáld.",
      "- Kapcsolódj, de válts fókuszt (más részlet, más dimenzió).",
      "",
      "Biztonság:",
      "- Ne értelmezd az álmot, ne diagnosztizálj, ne szimbólumszótár.",
      "",
      "Formai szabályok:",
      "- Pontosan 1 kérdés; ne legyen felsorolás; legfeljebb 1 kérdőjel.",
      "- Karakterlimitek: lead_in <= 280, question <= 160, cta <= 120.",
      "- Mindig legyen stop_signal mező (normál: suggest_stop=false).",
      "",
      "Kimenet kizárólag JSON ebben a sémában:",
      "{\"work_block\":{\"lead_in\":\"\",\"question\":\"\",\"cta\":\"\"},\"stop_signal\":{\"suggest_stop\":false,\"reason\":null},\"flags\":{\"safety\":\"none\"}}",
    ].join("\n");

    const recentQs = history
      .map((h) => h.question)
      .filter(Boolean)
      .slice(-RECENT_QS_FOR_SIMILARITY);

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
        max_tokens: 500,
      });

      const rawContent = completion.choices?.[0]?.message?.content ?? "";
      const parsed = await parseModelJSON(rawContent);
      const sanitized = validateModelOutput(parsed);
      if (!sanitized) throw new Error("Invalid model output");
      return sanitized;
    }

    // 1) első próbálkozás
    const first = await callModel();

    // ha pont ugyanaz mint előző kérdés → tekintsük low novelty jelnek (nem 502)
    const exactRepeat =
      previousQuestion &&
      first.work_block.question.trim().toLowerCase() === previousQuestion.trim().toLowerCase();

    const tooSimilar = (recentQs.length > 0 && isTooSimilar(first.work_block.question, recentQs)) || exactRepeat;

    if (!tooSimilar) return NextResponse.json(first);

    // 2) retry: explicit fókuszváltás + tiltás
    const retry = await callModel([
      `FONTOS: A következő kérdés NEM lehet ugyanaz vagy parafrázis ezekhez: ${recentQs.join(" | ")}`,
      "Válts fókuszt: ha eddig állapot/érzés volt, menj jelenet/szenzoros/sorrend irányba, vagy fordítva — de maradj az irány keretében.",
      "Ha így sem tudsz lényegesen új, érdemi kérdést adni, akkor adj egy rövid, egyszerű kérdést, ami másik konkrét elemre kérdez rá.",
    ]);

    const tooSimilarAgain = recentQs.length > 0 && isTooSimilar(retry.work_block.question, recentQs);

    if (tooSimilarAgain) {
      // 3) kontrollált lezárás
      return NextResponse.json(makeLowNoveltyClosure("none"));
    }

    return NextResponse.json(retry);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
