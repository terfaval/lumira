// /app/api/synthesize/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { compactDreamObservation, parseDreamObservation } from "@/src/lib/dream/observation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_DREAM_LENGTH = 20;
const OPENAI_TIMEOUT_MS = 15000;
const MODEL = "gpt-4o-mini";

const MAX_CANDIDATES = 5;
const MIN_CANDIDATES = 3;
const MAX_ANCHOR_ITEMS = 6;
const MAX_HISTORY_USED = 4;

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
  dream_text?: string; // optional (sanity only)
  history?: HistoryItem[];
  prior_echoes?: PriorEcho[];
  allowed_slugs?: string[];
  force?: boolean;
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
  question_seed: { preferred_style: "open_question_single", target_anchor: "" },
  prior_echoes_used: [],
  flags: { safety: "none", too_short: false },
});

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function clampArray(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v) => typeof v === "string")
    .slice(0, max)
    .map((v) => (v || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function clampHistory(history: unknown): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  const items = history.filter(
    (item) =>
      typeof (item as any)?.question === "string" &&
      (typeof (item as any)?.answer === "string" || (item as any)?.answer === null)
  );
  return (items as HistoryItem[]).slice(-MAX_HISTORY_USED);
}

function detectSafetyFallback(dreamText: string): SafetyValue {
  const lower = (dreamText ?? "").toLowerCase();
  const selfHarmKeywords = ["öngyilk", "megölöm magam", "véget vetek", "nem akarok élni", "suicide", "kill myself"];
  const realityConfusionKeywords = ["nem valós", "nem tudom mi a valós", "realitás", "hallucinat", "can't tell what's real"];
  if (selfHarmKeywords.some((kw) => lower.includes(kw))) return "self_harm";
  if (realityConfusionKeywords.some((kw) => lower.includes(kw))) return "reality_confusion";
  return "none";
}

function mapObsSafetyToFlags(obsFlag?: string): SafetyValue {
  // dream_observation schema: none|distress|reality_confusion|self_harm
  if (obsFlag === "self_harm") return "self_harm";
  if (obsFlag === "reality_confusion") return "reality_confusion";
  if (obsFlag && obsFlag !== "none") return "other";
  return "none";
}

function systemPrompt(): string {
  return [
    "You are an API that emits strict JSON (no prose, no markdown).",
    "Task: choose dream-work directions + seed the next question focus.",
    "",
    "PRIMARY TRUTH:",
    "- Use dream_observation as primary truth for anchors and direction matching.",
    "- Do NOT invent anchors that are not present in observation labels/evidence.",
    "- dream_text is only for sanity check / exact phrasing, not for new content.",
    "",
    "Rules:",
    "- Output JSON only using the specified schema.",
    "- candidate_directions: ranked list of 3-5 slugs, subset of allowed_slugs.",
    "- question_seed.target_anchor: MUST be one label from dream_observation (prefer: place/object/character/motif/beat).",
    "- anchors: derive from observation labels (dedupe, normalize).",
    "- felt_words: use tone labels (lowercase).",
    "- preferred_style must be one of the allowed styles (else open_question_single).",
    "- If safety is triggered (observation safety flag != none), candidate_directions MUST be empty.",
    "- If dream_text too short, set flags.too_short=true and candidate_directions=[].",
    "- Never interpret meaning, diagnose, or offer therapy language.",
    "",
    "Schema:",
    JSON.stringify({
      anchors: { characters: [], places: [], objects: [], beats: [], felt_words: [] },
      candidate_directions: [],
      question_seed: { preferred_style: "open_question_single", target_anchor: "" },
      prior_echoes_used: [],
      flags: { safety: "none", too_short: false },
    }),
  ].join("\n");
}

function parseModelJSON(rawContent: string): any | null {
  try {
    return JSON.parse(rawContent);
  } catch {
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(rawContent.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeOutput(raw: any, allowedSlugs: string[], fallback: SynthesizeOutput): SynthesizeOutput {
  if (!raw || typeof raw !== "object") return fallback;
  const allowed = new Set((allowedSlugs ?? []).filter(Boolean));

  const anchorsRaw = (raw.anchors ?? {}) as any;
  const anchors: Anchors = {
    characters: clampArray(anchorsRaw.characters, MAX_ANCHOR_ITEMS),
    places: clampArray(anchorsRaw.places, MAX_ANCHOR_ITEMS),
    objects: clampArray(anchorsRaw.objects, MAX_ANCHOR_ITEMS),
    beats: clampArray(anchorsRaw.beats, MAX_ANCHOR_ITEMS),
    felt_words: clampArray(anchorsRaw.felt_words, MAX_ANCHOR_ITEMS).map((w) => w.toLowerCase()),
  };

  const flagsRaw = (raw.flags ?? {}) as any;
  const safety: SafetyValue = SAFETY_VALUES.includes(flagsRaw.safety) ? flagsRaw.safety : "none";
  const too_short = Boolean(flagsRaw.too_short);

  let candidate_directions: string[] = [];
  if (!too_short && safety === "none" && Array.isArray(raw.candidate_directions)) {
    for (const s of raw.candidate_directions) {
      if (typeof s !== "string") continue;
      const slug = s.trim();
      if (!slug || !allowed.has(slug) || candidate_directions.includes(slug)) continue;
      candidate_directions.push(slug);
      if (candidate_directions.length >= MAX_CANDIDATES) break;
    }
    // ensure minimum if possible
    if (candidate_directions.length < Math.min(MIN_CANDIDATES, allowedSlugs.length)) {
      for (const slug of allowedSlugs) {
        if (candidate_directions.length >= MIN_CANDIDATES) break;
        if (!candidate_directions.includes(slug)) candidate_directions.push(slug);
      }
    }
  }

  const seedRaw = (raw.question_seed ?? {}) as any;
  const preferred_style_raw = typeof seedRaw.preferred_style === "string" ? seedRaw.preferred_style : "";
  const preferred_style =
    (ALLOWED_PREFERRED_STYLES as readonly string[]).includes(preferred_style_raw)
      ? preferred_style_raw
      : "open_question_single";
  const target_anchor = typeof seedRaw.target_anchor === "string" ? seedRaw.target_anchor : "";

  const out: SynthesizeOutput = {
    anchors,
    candidate_directions,
    question_seed: { preferred_style, target_anchor },
    prior_echoes_used: Array.isArray(raw.prior_echoes_used) ? raw.prior_echoes_used.slice(0, 2) : [],
    flags: { safety, too_short },
  };

  if (out.flags.safety !== "none") out.candidate_directions = [];
  if (out.flags.too_short) out.candidate_directions = [];

  return out;
}

async function fetchObservation(supabase: any, sessionId: string, userId: string) {
  const { data } = await supabase
    .from("dream_observation")
    .select("obs")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  const parsed = parseDreamObservation(data?.obs ?? null);
  return parsed ? compactDreamObservation(parsed) : null;
}

async function fetchSessionDreamText(supabase: any, sessionId: string, userId: string): Promise<string | null> {
  const { data: session } = await supabase
    .from("dream_sessions")
    .select("raw_dream_text")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  const t = typeof (session as any)?.raw_dream_text === "string" ? (session as any).raw_dream_text : "";
  const clean = (t ?? "").replace(/\s+/g, " ").trim();
  return clean || null;
}

// ✅ best-effort ensure observation exists (same idea as frame)
async function ensureObservation(args: { req: Request; sessionId: string; dreamText: string }) {
  const url = new URL("/api/observe", args.req.url).toString();
  const cookieHeader = args.req.headers.get("cookie") ?? "";
  const authHeader = args.req.headers.get("authorization") ?? "";

  try {
    await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
        "x-observe-source": "synthesize",
      },
      body: JSON.stringify({ session_id: args.sessionId, dream_text: args.dreamText }),
    });
  } catch (e) {
    console.warn("synthesize: ensureObservation failed", e);
  }
}

// ✅ use the SAME authed supabase instance (no supabaseServer() here)
async function fetchCatalogForAI(supabase: any) {
  const { data: rows } = await supabase
    .from("direction_catalog")
    .select("slug, title, description, content, tags, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return Array.isArray(rows) ? rows : [];
}

async function persistLatent(supabase: any, sessionId: string, userId: string, output: SynthesizeOutput) {
  const { error } = await supabase
    .from("dream_session_summaries")
    .upsert({ session_id: sessionId, user_id: userId, latent_analysis: output }, { onConflict: "session_id" });

  if (error) console.warn("synthesize: persist latent failed", error.message);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SynthesizeInput;

    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
    const force = Boolean(body.force);
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    // Idempotency: if latent exists and not force -> return it
    if (!force) {
      const { data } = await supabase
        .from("dream_session_summaries")
        .select("latent_analysis")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      const existing = (data as any)?.latent_analysis ?? null;
      if (existing && typeof existing === "object") return NextResponse.json(existing as SynthesizeOutput);
      if (typeof existing === "string") {
        const parsed = parseModelJSON(existing);
        if (parsed && typeof parsed === "object") return NextResponse.json(parsed as SynthesizeOutput);
      }
    }

    // dream_text sanity: from request or DB (optional)
    const dreamTextReq = String(body.dream_text ?? "").trim();
    const dreamTextDb = dreamTextReq ? null : await fetchSessionDreamText(supabase, sessionId, userId);
    const dreamText = dreamTextReq || dreamTextDb || "";

    const tooShort = dreamText ? dreamText.length < MIN_DREAM_LENGTH : false;

    // Try to load observation; if missing but we have text, generate it now (best-effort) then re-load.
    let observation = await fetchObservation(supabase, sessionId, userId);
    if (!observation && dreamText) {
      await ensureObservation({ req, sessionId, dreamText });
      observation = await fetchObservation(supabase, sessionId, userId);
    }

    // If no observation and no dreamText, we can't do meaningful synthesize
    if (!observation && !dreamText) {
      return NextResponse.json({ error: "Missing observation and dream_text" }, { status: 400 });
    }

    // Too short gate (only if we have text)
    if (dreamText && tooShort) {
      const out = defaultOutput();
      out.flags.too_short = true;
      await persistLatent(supabase, sessionId, userId, out);
      return NextResponse.json(out);
    }

    // Safety gate observation-first
    const obsSafety = mapObsSafetyToFlags((observation as any)?.safety?.flag);
    if (obsSafety !== "none") {
      const out = defaultOutput();
      out.flags.safety = obsSafety;
      out.candidate_directions = [];
      await persistLatent(supabase, sessionId, userId, out);
      return NextResponse.json(out);
    }

    // Fallback safety if obs missing
    if (!observation && dreamText) {
      const fallbackSafety = detectSafetyFallback(dreamText);
      if (fallbackSafety !== "none") {
        const out = defaultOutput();
        out.flags.safety = fallbackSafety;
        out.candidate_directions = [];
        await persistLatent(supabase, sessionId, userId, out);
        return NextResponse.json(out);
      }
    }

    const catalog = await fetchCatalogForAI(supabase);
    const allowedSlugsReq = (body.allowed_slugs ?? [])
      .filter((s) => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);

    const allowedPool = allowedSlugsReq.length ? allowedSlugsReq : catalog.map((r: any) => r.slug).filter(Boolean);

    const history = clampHistory(body.history);
    const priorEchoes = Array.isArray(body.prior_echoes) ? body.prior_echoes.slice(0, 2) : [];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userPayload = {
      dream_observation: observation, // PRIMARY
      dream_text_excerpt: dreamText.slice(0, 1800), // sanity only
      history,
      prior_echoes: priorEchoes,
      catalog,
      allowed_slugs: allowedPool,
    };

    const completion = await withTimeout(
      (signal) =>
        client.chat.completions.create(
          {
            model: MODEL,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt() },
              { role: "user", content: JSON.stringify(userPayload) },
            ],
            max_tokens: 750,
          },
          { signal }
        ),
      OPENAI_TIMEOUT_MS
    );

    const rawContent = completion.choices?.[0]?.message?.content ?? "";
    const parsed = parseModelJSON(rawContent);

    const out = sanitizeOutput(parsed, allowedPool, defaultOutput());
    await persistLatent(supabase, sessionId, userId, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
