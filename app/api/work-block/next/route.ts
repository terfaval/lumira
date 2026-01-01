import OpenAI from "openai";
import { NextResponse } from "next/server";

const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;
const MAX_HISTORY = 4;
const MAX_PRIOR_ECHOES = 2;
const LEAD_IN_LIMIT = 280;
const QUESTION_LIMIT = 160;
const CTA_LIMIT = 120;
const BRIEF_ANSWER_LIMIT = 30;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type SafetyValue = (typeof SAFETY_VALUES)[number];

type HistoryItem = { question: string; answer: string | null };
type PriorEcho = { session_id: string; anchor_summary: string; created_at: string };

type DirectionInput = {
  method_spec?: { question_style?: string } & Record<string, unknown>;
  stop_criteria?: {
    max_cards?: number;
    stop_if_user_brief_streak?: number;
    stop_if_repetition_detected?: boolean;
  } & Record<string, unknown>;
  output_spec?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  focus_model?: Record<string, unknown>;
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
  dream_text?: string;
  direction?: DirectionInput;
  history?: HistoryItem[];
  synth?: SynthInput;
  prior_echoes?: PriorEcho[];
};

function sanitizeSafety(flags?: SynthInput["flags"]): SafetyValue {
  const safety = flags?.safety ?? "none";
  return SAFETY_VALUES.includes(safety as SafetyValue)
    ? (safety as SafetyValue)
    : "other";
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

function shouldStop(direction: DirectionInput | undefined, history: HistoryItem[]): {
  suggest_stop: boolean;
  reason: string | null;
} {
  const stopCriteria = direction?.stop_criteria ?? {};
  const maxCards = typeof stopCriteria.max_cards === "number" ? stopCriteria.max_cards : undefined;
  if (maxCards && history.length >= maxCards) {
    return { suggest_stop: true, reason: "max_cards" };
  }

  if (detectRepetition(history, !!stopCriteria.stop_if_repetition_detected)) {
    return { suggest_stop: true, reason: "repetition" };
  }

  if (detectUserBriefStreak(history, stopCriteria.stop_if_user_brief_streak as number | undefined)) {
    return { suggest_stop: true, reason: "user_brief_streak" };
  }

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

  const suggestStop = Boolean(stopSignal?.suggest_stop);
  const reason = typeof stopSignal?.reason === "string" ? stopSignal.reason : null;

  const safety = SAFETY_VALUES.includes(flags?.safety as SafetyValue)
    ? (flags.safety as SafetyValue)
    : "other";

  return {
    work_block: clampWorkBlock({ lead_in: leadIn, question, cta }),
    stop_signal: { suggest_stop: suggestStop, reason },
    flags: { safety },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const dreamText = (body.dream_text ?? "").trim();
    const direction = body.direction;
    const history = sanitizeHistory(body.history);
    const priorEchoes = sanitizePriorEchoes(body.prior_echoes);
    const safetyFlag = sanitizeSafety(body.synth?.flags);

    if (!dreamText) {
      return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });
    }

    if (!direction) {
      return NextResponse.json({ error: "Missing direction" }, { status: 400 });
    }

    if (safetyFlag !== "none") {
      return NextResponse.json(makeClosureResponse("safety", safetyFlag));
    }

    const stopSignal = shouldStop(direction, history);
    if (stopSignal.suggest_stop) {
      return NextResponse.json(makeClosureResponse(stopSignal.reason, safetyFlag));
    }

    const systemPrompt = [
      "You are an API that returns ONLY strict JSON using the provided schema.",
      "Role: generate the next work-block card (1 question) for a dream exploration.",
      "Rules:",
      "- Exactly one question string; non-empty; no multiple questions.",
      "- No interpretation, symbol dictionary, diagnosis, or therapy language.",
      "- Respect direction.method_spec.question_style for tone/shape.",
      "- Stay under character limits: lead_in <= 280, question <= 160, cta <= 120.",
      "- stop_signal must always be present (suggest_stop=false in normal flow).",
      "- Output JSON only, no markdown, no explanations.",
      "Schema:",
      JSON.stringify({
        work_block: { lead_in: "", question: "", cta: "" },
        stop_signal: { suggest_stop: false, reason: null },
        flags: { safety: "none" },
      }),
    ].join("\n");

    const userPayload = {
      dream_text: dreamText,
      direction,
      history,
      prior_echoes: priorEchoes,
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const rawContent = completion.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from model" }, { status: 500 });
    }

    const sanitized = validateModelOutput(parsed);
    if (!sanitized) {
      return NextResponse.json({ error: "Invalid model output" }, { status: 500 });
    }

    return NextResponse.json(sanitized);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}