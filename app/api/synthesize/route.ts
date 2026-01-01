import OpenAI from "openai";
import { NextResponse } from "next/server";

const MIN_DREAM_LENGTH = 20;
const MAX_ANCHOR_ITEMS = 6;
const MAX_CANDIDATES = 5;
const MIN_CANDIDATES = 3;
const MAX_PRIOR_ECHOES_USED = 2;
const MAX_MATCHED_ITEMS = 2;

const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;
type SafetyValue = (typeof SAFETY_VALUES)[number];

type HistoryItem = { question: string; answer: string | null };
type PriorEcho = { session_id: string; anchor_summary: string; created_at: string };
type SynthesizeInput = {
  dream_text?: string;
  history?: HistoryItem[];
  prior_echoes?: PriorEcho[];
  catalog?: unknown;
  allowed_slugs?: string[];
};

type Anchors = {
  characters: string[];
  places: string[];
  objects: string[];
  beats: string[];
  felt_words: string[];
};

type QuestionSeed = { preferred_style: string; target_anchor: string };

type PriorEchoUsed = { session_id: string; matched_items: string[] };

type Flags = { safety: SafetyValue; too_short: boolean };

type SynthesizeOutput = {
  anchors: Anchors;
  candidate_directions: string[];
  question_seed: QuestionSeed;
  prior_echoes_used: PriorEchoUsed[];
  flags: Flags;
};

const emptyAnchors = (): Anchors => ({
  characters: [],
  places: [],
  objects: [],
  beats: [],
  felt_words: [],
});

const defaultOutput = (): SynthesizeOutput => ({
  anchors: emptyAnchors(),
  candidate_directions: [],
  question_seed: { preferred_style: "", target_anchor: "" },
  prior_echoes_used: [],
  flags: { safety: "none", too_short: false },
});

function clampArray(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v) => typeof v === "string")
    .slice(0, max)
    .map((v) => v.trim())
    .filter(Boolean);
}

function sanitizeFlags(flags: unknown, dreamTooShort: boolean): Flags {
  const raw = (flags ?? {}) as Partial<Flags>;
  const safety = SAFETY_VALUES.includes(raw.safety as SafetyValue)
    ? (raw.safety as SafetyValue)
    : "other";
  return {
    safety,
    too_short: dreamTooShort || Boolean(raw.too_short),
  };
}

function sanitizePriorEchoesUsed(values: unknown): PriorEchoUsed[] {
  if (!Array.isArray(values)) return [];
  return values
    .slice(0, MAX_PRIOR_ECHOES_USED)
    .map((item) => ({
      session_id: typeof item?.session_id === "string" ? item.session_id : "",
      matched_items: clampArray(item?.matched_items, MAX_MATCHED_ITEMS),
    }))
    .filter((p) => p.session_id);
}

function sanitizeAnchors(anchors: unknown): Anchors {
  const raw = (anchors ?? {}) as Partial<Anchors>;
  return {
    characters: clampArray(raw.characters, MAX_ANCHOR_ITEMS),
    places: clampArray(raw.places, MAX_ANCHOR_ITEMS),
    objects: clampArray(raw.objects, MAX_ANCHOR_ITEMS),
    beats: clampArray(raw.beats, MAX_ANCHOR_ITEMS),
    felt_words: clampArray(raw.felt_words, MAX_ANCHOR_ITEMS),
  };
}

function sanitizeQuestionSeed(seed: unknown): QuestionSeed {
  const raw = (seed ?? {}) as Partial<QuestionSeed>;
  return {
    preferred_style: typeof raw.preferred_style === "string" ? raw.preferred_style : "",
    target_anchor: typeof raw.target_anchor === "string" ? raw.target_anchor : "",
  };
}

function sanitizeCandidates(
  candidates: unknown,
  allowed: Set<string>,
  flags: Flags
): string[] {
  if (flags.too_short || flags.safety !== "none") return [];
  if (!Array.isArray(candidates)) return [];
  const filtered = candidates
    .filter((c) => typeof c === "string" && allowed.has(c))
    .slice(0, MAX_CANDIDATES);

  if (filtered.length >= MIN_CANDIDATES) return filtered;
  return filtered;
}

function sanitizeOutput(raw: unknown, allowedSlugs: string[], dreamTooShort: boolean): SynthesizeOutput {
  const allowedSet = new Set((allowedSlugs ?? []).filter((s) => typeof s === "string"));
  const fallback = defaultOutput();
  if (!raw || typeof raw !== "object") return fallback;

  const obj = raw as Record<string, unknown>;
  const anchors = sanitizeAnchors(obj.anchors);
  const flags = sanitizeFlags(obj.flags, dreamTooShort);
  const candidate_directions = sanitizeCandidates(
    obj.candidate_directions,
    allowedSet,
    flags
  );

  return {
    anchors,
    candidate_directions,
    question_seed: sanitizeQuestionSeed(obj.question_seed),
    prior_echoes_used: sanitizePriorEchoesUsed(obj.prior_echoes_used),
    flags,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SynthesizeInput;
    const dreamText = (body.dream_text ?? "").trim();
    const allowedSlugs = body.allowed_slugs ?? [];

    if (!dreamText) {
      return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });
    }

    const tooShort = dreamText.length < MIN_DREAM_LENGTH;

    if (tooShort) {
      const output = defaultOutput();
      output.flags.too_short = true;
      return NextResponse.json(output);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = [
      "You are an API that emits strict JSON (no prose, no markdown).",
      "Task: latent synthesis for dream direction selection and question seeding.",
      "Rules:",
      "- Output JSON only using the specified schema.",
      "- Anchors must quote literal or near-literal items from dream_text.",
      "- candidate_directions: ranked list of 3-5 slugs, subset of allowed_slugs.",
      "- Respect method_spec and selection_hints to match dream features to catalog.",
      "- prior_echoes_used obey dir-06: literal_or_near_literal_only, max_reference_items=2, differences_first.",
      "- Flags: safety can be none | self_harm | reality_confusion | other. If safety triggered, candidate_directions must be empty.",
      "- If dream_text too short, set flags.too_short=true and candidate_directions=[].",
      "- Never interpret meaning, diagnose, or offer therapy language.",
      "Schema:",
      JSON.stringify({
        anchors: { characters: [], places: [], objects: [], beats: [], felt_words: [] },
        candidate_directions: [],
        question_seed: { preferred_style: "", target_anchor: "" },
        prior_echoes_used: [],
        flags: { safety: "none", too_short: false },
      }),
    ].join("\n");

    const userPayload = {
      dream_text: dreamText,
      history: body.history ?? [],
      prior_echoes: body.prior_echoes ?? [],
      catalog: body.catalog ?? null,
      allowed_slugs: allowedSlugs,
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // server-side only
      temperature: 0,
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

    const output = sanitizeOutput(parsed, allowedSlugs, false);

    return NextResponse.json(output);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}