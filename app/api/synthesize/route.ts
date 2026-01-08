// /app/api/synthesize/route.ts (patched v1.1)
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { supabaseServer } from "@/src/lib/supabase/server";

const MIN_DREAM_LENGTH = 20;
const MAX_ANCHOR_ITEMS = 6;
const MAX_CANDIDATES = 5;
const MIN_CANDIDATES = 3;
const MAX_PRIOR_ECHOES_USED = 2;
const MAX_MATCHED_ITEMS = 2;
const MAX_ANCHOR_SUMMARY_LENGTH = 800;

const ALLOWED_PREFERRED_STYLES = [
  "sequence_probe_single",
  "state_probe_single",
  "emotion_label_single",
  "sensory_probe_single",
  "compare_probe_single",
  "resonance_single",
  "open_question_single",
  "perspective_shift_single",
  "creative_transform_single",
  "closure_choice_single",
  "choice_point_single",
  "association_single",
] as const;

const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;
type SafetyValue = (typeof SAFETY_VALUES)[number];

type HistoryItem = { question: string; answer: string | null };
type PriorEcho = { session_id: string; anchor_summary: string; created_at: string };

type SynthesizeInput = {
  session_id?: string;
  dream_text?: string;
  history?: HistoryItem[];
  prior_echoes?: PriorEcho[];
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

export type SynthesizeOutput = {
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

// ────────────────────────────────────────────────────────────────────────────────
// Helpers: sanitize & small normalizers
// ────────────────────────────────────────────────────────────────────────────────
function clampArray(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v) => typeof v === "string")
    .slice(0, max)
    .map((v) => (v || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function dedupeCaseFold(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function capFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sanitizeFlags(flags: unknown, dreamTooShort: boolean): Flags {
  const raw = (flags ?? {}) as Partial<Flags>;
  const safety: SafetyValue =
    SAFETY_VALUES.includes(raw.safety as SafetyValue) ? (raw.safety as SafetyValue) : "none";

  return {
    safety,
    too_short: dreamTooShort || Boolean(raw.too_short),
  };
}

function sanitizePriorEchoesUsed(values: unknown, allowedSessionIds: Set<string>): PriorEchoUsed[] {
  if (!Array.isArray(values)) return [];
  return values
    .slice(0, MAX_PRIOR_ECHOES_USED)
    .map((item) => ({
      session_id: typeof (item as any)?.session_id === "string" ? (item as any).session_id : "",
      matched_items: clampArray((item as any)?.matched_items, MAX_MATCHED_ITEMS),
    }))
    .filter((p) => p.session_id && allowedSessionIds.has(p.session_id));
}

function sanitizeAnchors(anchors: unknown): Anchors {
  const raw = (anchors ?? {}) as Partial<Anchors>;
  const characters = dedupeCaseFold(clampArray(raw.characters, MAX_ANCHOR_ITEMS)).map(capFirst);
  const places = dedupeCaseFold(clampArray(raw.places, MAX_ANCHOR_ITEMS)).map(capFirst);
  const objects = dedupeCaseFold(clampArray(raw.objects, MAX_ANCHOR_ITEMS));
  const beats = dedupeCaseFold(clampArray(raw.beats, MAX_ANCHOR_ITEMS));
  const felt_words = dedupeCaseFold(clampArray(raw.felt_words, MAX_ANCHOR_ITEMS));
  return { characters, places, objects, beats, felt_words };
}

function sanitizeQuestionSeed(seed: unknown): QuestionSeed {
  const raw = (seed ?? {}) as Partial<QuestionSeed>;
  return {
    preferred_style:
      typeof raw.preferred_style === "string" && (ALLOWED_PREFERRED_STYLES as readonly string[]).includes(raw.preferred_style)
        ? raw.preferred_style
        : "",
    target_anchor: typeof raw.target_anchor === "string" ? raw.target_anchor : "",
  };
}

// Fisher–Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitizeCandidates(
  candidates: unknown,
  allowed: Set<string>,
  flags: Flags,
  allowedSlugs: string[]
): string[] {
  if (flags.too_short || flags.safety !== "none") return [];
  if (!Array.isArray(candidates)) return [];

  const filtered: string[] = [];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !allowed.has(candidate)) continue;
    if (filtered.includes(candidate)) continue;
    filtered.push(candidate);
    if (filtered.length >= MAX_CANDIDATES) break;
  }

  const targetLength = Math.min(MIN_CANDIDATES, MAX_CANDIDATES, allowedSlugs.length);
  if (filtered.length >= targetLength || targetLength === 0) return filtered;

  const filteredSet = new Set(filtered);
  const fallback: string[] = [];
  const allowedPool = shuffle(allowedSlugs);

  const addByKeywords = (keywords: string[]) => {
    for (const slug of allowedPool) {
      if (filteredSet.has(slug) || fallback.includes(slug)) continue;
      if (keywords.some((kw) => slug.toLowerCase().includes(kw))) {
        fallback.push(slug);
      }
      if (filtered.length + fallback.length >= targetLength) return;
    }
  };

  // bővített kulcsszavak
  addByKeywords(["narrativ", "perspektiv"]);
  addByKeywords(["visszalepes"]);
  addByKeywords(["folytatas"]);
  addByKeywords(["erzelm"]);
  addByKeywords(["testi", "lenyomat"]);

  if (filtered.length + fallback.length < targetLength) {
    for (const slug of allowedPool) {
      if (filteredSet.has(slug) || fallback.includes(slug)) continue;
      fallback.push(slug);
      if (filtered.length + fallback.length >= targetLength) break;
    }
  }

  return [...filtered, ...fallback].slice(0, Math.min(targetLength, MAX_CANDIDATES));
}

function sanitizeOutput(
  raw: unknown,
  allowedSlugs: string[],
  dreamTooShort: boolean,
  priorEchoSessionIds: Set<string>
): SynthesizeOutput {
  const allowedSet = new Set((allowedSlugs ?? []).filter((s) => typeof s === "string"));
  const fallback = defaultOutput();
  if (!raw || typeof raw !== "object") return fallback;

  const obj = raw as Record<string, unknown>;
  const anchors = sanitizeAnchors(obj.anchors);
  const flags = sanitizeFlags(obj.flags, dreamTooShort);
  const candidate_directions = sanitizeCandidates(obj.candidate_directions, allowedSet, flags, allowedSlugs);

  return {
    anchors,
    candidate_directions,
    question_seed: sanitizeQuestionSeed(obj.question_seed),
    prior_echoes_used: sanitizePriorEchoesUsed(obj.prior_echoes_used, priorEchoSessionIds),
    flags,
  };
}

function detectSafety(dreamText: string): SafetyValue {
  const lower = dreamText.toLowerCase();
  const selfHarmKeywords = ["suicide", "kill myself", "end my life", "öngyilk", "megölöm magam", "véget vetek", "nem akarok élni"];
  const realityConfusionKeywords = ["not real", "can't tell what's real", "hallucinat", "nem valós", "nem tudom mi a valós", "realitás"];

  if (selfHarmKeywords.some((kw) => lower.includes(kw))) return "self_harm";
  if (realityConfusionKeywords.some((kw) => lower.includes(kw))) return "reality_confusion";
  return "none";
}

function clampHistory(history: unknown): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  const items = history.filter(
    (item) =>
      typeof (item as any)?.question === "string" &&
      (typeof (item as any)?.answer === "string" || (item as any)?.answer === null)
  );
  return items.slice(-4);
}

function clampPriorEchoes(priorEchoes: unknown): PriorEcho[] {
  if (!Array.isArray(priorEchoes)) return [];
  return priorEchoes
    .slice(0, MAX_PRIOR_ECHOES_USED)
    .map((echo) => ({
      session_id: typeof (echo as any)?.session_id === "string" ? (echo as any).session_id : "",
      anchor_summary:
        typeof (echo as any)?.anchor_summary === "string"
          ? (echo as any).anchor_summary.slice(0, MAX_ANCHOR_SUMMARY_LENGTH)
          : "",
      created_at: typeof (echo as any)?.created_at === "string" ? (echo as any).created_at : "",
    }))
    .filter((echo) => echo.session_id && echo.anchor_summary);
}

// append log helper (RPC)
async function persistLatentAppendLog(req: Request, args: { sessionId?: string; output: SynthesizeOutput; meta: Record<string, unknown> }) {
  const { sessionId, output, meta } = args;
  if (!sessionId) return;

  const supabase = await supabaseServerAuthed(req);
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return;

  const { error } = await supabase.rpc("append_latent_analysis", {
    p_session_id: sessionId,
    p_output: output,
    p_meta: meta,
  });

  if (error) console.warn("append_latent_analysis failed", error.message);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SynthesizeInput;

    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
    const dreamText = (body.dream_text ?? "").trim();

    const allowedSlugs = (body.allowed_slugs ?? [])
      .filter((s) => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!dreamText) return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });

    const tooShort = dreamText.length < MIN_DREAM_LENGTH;
    if (tooShort) {
      const output = defaultOutput();
      output.flags.too_short = true;

      await persistLatentAppendLog(req, { sessionId, output, meta: { source: "synthesize", note: "too_short" } });
      return NextResponse.json(output);
    }

    const detectedSafety = detectSafety(dreamText);
    if (detectedSafety !== "none") {
      const output = defaultOutput();
      output.flags.safety = detectedSafety;

      await persistLatentAppendLog(req, {
        sessionId,
        output,
        meta: { source: "synthesize", note: "safety", safety: detectedSafety },
      });

      return NextResponse.json(output);
    }

    const history = clampHistory(body.history);
    const priorEchoes = clampPriorEchoes(body.prior_echoes);
    const priorEchoSessionIds = new Set(priorEchoes.map((p) => p.session_id));

    // ✅ catalog: DB-ből (nem kliensből)
    const sb = await supabaseServer();
    const { data: rows, error: catErr } = await sb
      .from("direction_catalog")
      .select("slug, title, description, content, tags, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (catErr) {
      console.warn("direction_catalog fetch failed", catErr.message);
    }

    const catalogForAI = Array.isArray(rows) ? rows : [];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = [
      "You are an API that emits strict JSON (no prose, no markdown).",
      "Task: latent synthesis for dream direction selection and question seeding.",
      "Rules:",
      "- Output JSON only using the specified schema.",
      "- Read and consider the ENTIRE dream_text; do not prioritize the beginning.",
      "- Anchors must quote literal or near-literal items from dream_text.",
      "- beats should be listed in rough CHRONOLOGICAL order (early→late).",
      "- places must include recognizable PROPER NOUNS with correct Hungarian accents if present (e.g., Logodi, Lánchíd, Vár).",
      "- Normalize obvious casing/spacing; deduplicate items.",
      "- Aim for rich coverage if present: beats ≥4, places ≥3, objects ≥3, characters ≥2, felt_words ≥2 (subject to max caps).",
      "- candidate_directions: ranked list of 3-5 slugs, subset of allowed_slugs.",
      "- Use catalog to match dream features to directions (content.method_spec, focus_model, selection_hints).",
      "- prior_echoes_used obey dir-06 constraints: literal_or_near_literal_only, max_reference_items=2, differences_first.",
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
      history,
      prior_echoes: priorEchoes,
      catalog: catalogForAI,
      allowed_slugs: allowedSlugs,
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      max_tokens: 700,
    });

    const rawContent = completion.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const firstBrace = rawContent.indexOf("{");
      const lastBrace = rawContent.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsed = JSON.parse(rawContent.slice(firstBrace, lastBrace + 1));
      } else {
        return NextResponse.json({ error: "Invalid JSON from model" }, { status: 500 });
      }
    }

    const output = sanitizeOutput(parsed, allowedSlugs, false, priorEchoSessionIds);

    await persistLatentAppendLog(req, {
      sessionId,
      output,
      meta: {
        source: "synthesize",
        model: "gpt-4o-mini",
        has_candidates: output.candidate_directions.length,
        safety: output.flags.safety,
        too_short: output.flags.too_short,
      },
    });

    return NextResponse.json(output);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
