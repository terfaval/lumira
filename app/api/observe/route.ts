// /app/api/observe/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import {
  compactDreamObservation,
  parseDreamObservation,
} from "@/src/lib/dream/observation";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { shouldKeepAnchorLabel } from "@/src/lib/dream/huAnchorHygiene";
import { sha256, materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import {
  insertObservationVersionIfMissing,
  upsertObservationLatest,
} from "@/src/db/repositories/observationRepo";
import { fetchObservationLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-4o-mini";
const MIN_DREAM_LEN = 20;
const OPENAI_TIMEOUT_MS = 15000;

type HistoryItem = { question: string; answer: string | null };

type RequestBody = {
  session_id?: string;
  dream_text?: string;

  // v2
  mode?: "initial" | "refresh";
  history?: HistoryItem[]; // refreshnél az utolsó 3 Q/A-t érdemes küldeni
  raw_delta?: string; // ha a kliens/BE tudja: csak az új rész
};

function sanitizeText(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

function buildObservationInputHash(params: {
  mode: "initial" | "refresh";
  dreamText: string;
  rawDelta: string;
  history: HistoryItem[];
}) {
  const material = materialHashFromPayload({
    mode: params.mode,
    dream_text: params.dreamText,
    raw_delta: params.rawDelta,
    history: params.history,
  });
  return sha256(`observe:${material}`);
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function clampHistory(history: unknown, max = 3): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  const items = history.filter(
    (item) =>
      typeof (item as any)?.question === "string" &&
      (typeof (item as any)?.answer === "string" || (item as any)?.answer === null)
  ) as HistoryItem[];
  return items.slice(-max);
}

/** ✅ Always schema-complete empty observation (safe fallback) */
function emptyObs() {
  return {
    entities: {
      characters: [],
      places: [],
      objects: [],
      other: [],
    },
    beats: [],
    motifs: [],
    tone: [],
    structure: [],
    body: [],
    safety: { flag: "none", evidence: [] as string[] },
  } as const;
}

/* ────────────────────────────────────────────────────────────── */
/*  Event/Anchor helpers (for domain_events logging)    */
/* ────────────────────────────────────────────────────────────── */

function uniq(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of arr) {
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function labelsFromList(list: any): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const it of list) {
    const label = (it as any)?.label;
    if (typeof label === "string") out.push(label);
  }
  return out;
}

function buildAnchorKeysFromObservation(observation: any): string[] {
  const obs = observation || {};
  const entities = obs.entities || {};

  // Pre-filter labels for minimal HU hygiene before anchorKey():
  // - Drop ordinal-only tokens (e.g. "negyedik", "4.", "negadik")
  // - For places: require place-context nouns ("emelet", "szint", "haz", "utca", ...)
  const rawLabels: string[] = [];

  rawLabels.push(
    ...labelsFromList(entities.characters).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(entities.places).filter((s) => shouldKeepAnchorLabel(s, { category: "place" })),
    ...labelsFromList(entities.objects).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(entities.other).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(obs.beats).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(obs.motifs).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(obs.tone).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(obs.structure).filter((s) => shouldKeepAnchorLabel(s)),
    ...labelsFromList(obs.body).filter((s) => shouldKeepAnchorLabel(s))
  );

  const keys = rawLabels.map((s) => anchorKey(s)).filter(Boolean);

  return uniq(keys);
}

async function safeInsertObservationEvent(params: {
  supabase: any;
  sessionId: string;
  userId: string;
  payload: any;
}) {
  try {
    const { error } = await params.supabase.from("domain_events").insert({
      session_id: params.sessionId,
      user_id: params.userId,
      type: "observation.extracted",
      payload: params.payload ?? {},
    });
    if (error) console.warn("observe: event insert failed", error);
  } catch (e) {
    console.warn("observe: event insert exception", e);
  }
}

/* ────────────────────────────────────────────────────────────── */

function buildSystemPrompt(): string {
  return [
    "You extract non-interpretive observations from dream text and optional Q/A context.",
    "Return ONLY valid JSON that follows the schema exactly. No markdown.",
    "",
    "Forbidden outputs:",
    "- interpretation, meaning, or diagnosis",
    "- advice, instructions, or therapy language",
    "- authoritative claims about the user",
    "- symbolism dictionaries or psychoanalysis",
    "",
    "If history is provided, you may use it ONLY to:",
    "- clarify labels (rename to more literal phrasing) when the user explicitly states it",
    "- add missing observable items the user explicitly mentioned",
    "- remove items that the user explicitly denies",
    "Never add meaning; stay descriptive.",
    "",
    "Beats rules:",
    "- Provide 4–6 beats if present, in rough chronological order (early→late).",
    "- Include one clear turning point/climax if present.",
    "- Ensure one LATE beat captures the final distinct location/event (closing scene).",
    "",
    "Schema (all keys required):",
    "{",
    '  "entities": {',
    '    "characters": [{"label": "...", "evidence": ["..."]}],',
    '    "places": [{"label": "...", "evidence": ["..."]}],',
    '    "objects": [{"label": "...", "evidence": ["..."]}],',
    '    "other": [{"label": "...", "evidence": ["..."]}]',
    "  },",
    '  "beats": [{"label": "...", "evidence": ["..."]}],',
    '  "motifs": [{"label": "...", "evidence": ["..."]}],',
    '  "tone": [{"label": "...", "evidence": ["..."]}],',
    '  "structure": [{"label": "...", "evidence": ["..."]}],',
    '  "body": [{"label": "...", "evidence": ["..."]}],',
    '  "safety": { "flag": "none|distress|reality_confusion|self_harm", "evidence": ["..."] }',
    "}",
    "",
    "Evidence must be short quotes or tight paraphrases from the INPUT dream text or raw_delta.",
    "If safety flag is not none, include evidence. If none, evidence can be empty.",
    "Do not add extra keys.",
  ].join("\n");
}

function parseModelJSON(rawContent: string): unknown {
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

async function fetchSessionDreamText(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<string | null> {
  const { data: entry, error: entryError } = await supabase
    .from("dream_entries")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .in("kind", ["raw", "raw_entry"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (entryError || !entry) return null;
  return sanitizeText(entry.content ?? "");
}

async function fetchExistingObservation(supabase: any, sessionId: string, userId: string) {
  const latest = await fetchObservationLatestWithPayloadAndId(supabase, userId, sessionId);
  const parsed = parseDreamObservation(latest?.payload ?? null);
  return parsed ?? null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const sessionId = body.session_id;
    if (!sessionId)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    const mode: "initial" | "refresh" = body.mode === "refresh" ? "refresh" : "initial";

    // Load dream text (either from body or DB)
    let dreamText = sanitizeText(body.dream_text ?? "");
    if (!dreamText) {
      const fromDb = await fetchSessionDreamText(supabase, sessionId, userId);
      if (!fromDb) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      dreamText = fromDb;
    }

    const history = mode === "refresh" ? clampHistory(body.history, 3) : [];
    const rawDelta = mode === "refresh" ? sanitizeText(body.raw_delta ?? "") : "";
    const primaryText = rawDelta || dreamText;

    // ? Short dream -> store schema-complete empty and return
    if (dreamText.length < MIN_DREAM_LEN) {
      const empty = emptyObs();
      const input_hash = buildObservationInputHash({ mode, dreamText, rawDelta, history });
      const obs = await insertObservationVersionIfMissing(supabase, {
        session_id: sessionId,
        user_id: userId,
        input_hash,
        payload: empty,
      });
      await upsertObservationLatest(supabase, {
        session_id: sessionId,
        user_id: userId,
        observation_version_id: obs.id,
      });

      // Log as observation.extracted event (non-fatal if it fails)
      const anchorKeys = buildAnchorKeysFromObservation(empty);
      await safeInsertObservationEvent({
        supabase,
        sessionId,
        userId,
        payload: {
          mode,
          too_short: true,
          raw_delta_used: false,
          observation: empty,
          anchor_keys: anchorKeys,
          observation_version_id: obs.id,
        },
      });

      return NextResponse.json({
        ok: true,
        session_id: sessionId,
        has_obs: true,
        mode,
        too_short: true,
      });
    }

    const existingObs = mode === "refresh" ? await fetchExistingObservation(supabase, sessionId, userId) : null;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = buildSystemPrompt();

    const userPayload = {
      mode,
      dream_text: primaryText,
      // keep a shorter full dream sanity excerpt (model is instructed to source evidence from primaryText/raw_delta)
      full_dream_text_sanity: dreamText.slice(0, 2500),
      existing_observation: existingObs ?? null,
      history,
      guidance:
        mode === "refresh"
          ? "Update and correct the existing observation using new text and Q/A. Stay purely descriptive."
          : "List observable elements only. No interpretation.",
    };

    let observationRaw: unknown;
    try {
      const completion = await withTimeout(
        (signal) =>
          client.chat.completions.create(
            {
              model: MODEL,
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(userPayload) },
              ],
              max_tokens: 1000,
            },
            { signal }
          ),
        OPENAI_TIMEOUT_MS
      );

      const raw = completion.choices?.[0]?.message?.content ?? "";
      observationRaw = parseModelJSON(raw);
    } catch (error) {
      console.warn("observe: model call failed", error);
      return NextResponse.json({ error: "Model call failed" }, { status: 500 });
    }

    const observation = parseDreamObservation(observationRaw);
    if (!observation) {
      console.warn("observe: invalid observation payload", observationRaw);
      return NextResponse.json({ error: "Invalid observation schema" }, { status: 500 });
    }

    const input_hash = buildObservationInputHash({ mode, dreamText, rawDelta, history });
    const obs = await insertObservationVersionIfMissing(supabase, {
      session_id: sessionId,
      user_id: userId,
      input_hash,
      model: MODEL,
      payload: observation,
    });

    await upsertObservationLatest(supabase, {
      session_id: sessionId,
      user_id: userId,
      observation_version_id: obs.id,
    });

    // Log as observation.extracted event (non-fatal if it fails)
    const obsAnchorKeys = buildAnchorKeysFromObservation(observation);
    await safeInsertObservationEvent({
      supabase,
      sessionId,
      userId,
      payload: {
        mode,
        raw_delta_used: Boolean(rawDelta),
        // store full observation for downstream reasoning (events timeline)
        observation,
        // small audit hints (optional)
        history_used: history?.length ?? 0,
        anchor_keys: obsAnchorKeys,
        observation_version_id: obs.id,
      },
    });

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      has_obs: true,
      mode,
      observation: compactDreamObservation(observation),
    });
  } catch (error) {
    console.warn("observe: handler exception", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
