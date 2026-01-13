// /app/api/observe/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import {
  compactDreamObservation,
  emptyDreamObservation,
  parseDreamObservation,
} from "@/src/lib/dream/observation";

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
  history?: HistoryItem[];       // refreshnél az utolsó 3 Q/A-t érdemes küldeni
  raw_delta?: string;            // ha a kliens/BE tudja: csak az új rész
};

function sanitizeText(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
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

async function fetchSessionDreamText(supabase: any, sessionId: string, userId: string): Promise<string | null> {
  const { data: session, error: sessionError } = await supabase
    .from("dream_sessions")
    .select("id, raw_dream_text, user_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) return null;
  return sanitizeText(session.raw_dream_text ?? "");
}

async function fetchExistingObservation(supabase: any, sessionId: string, userId: string) {
  const { data } = await supabase
    .from("dream_observation")
    .select("obs")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  const parsed = parseDreamObservation(data?.obs ?? null);
  return parsed ?? null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const sessionId = body.session_id;
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    const mode: "initial" | "refresh" = body.mode === "refresh" ? "refresh" : "initial";

    // Load dream text (either from body or DB)
    let dreamText = sanitizeText(body.dream_text ?? "");
    if (!dreamText) {
      const fromDb = await fetchSessionDreamText(supabase, sessionId, userId);
      if (!fromDb) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      dreamText = fromDb;
    }

    // Short dream → store empty and return
    if (dreamText.length < MIN_DREAM_LEN) {
      const empty = emptyDreamObservation(); // NOTE: update this to include beats: []
      const { error: upsertError } = await supabase
        .from("dream_observation")
        .upsert({ session_id: sessionId, user_id: userId, obs: empty }, { onConflict: "session_id" });

      if (upsertError) return NextResponse.json({ error: "Observation write failed" }, { status: 500 });
      return NextResponse.json({ ok: true, session_id: sessionId, has_obs: true, mode, too_short: true });
    }

    const existingObs = mode === "refresh" ? await fetchExistingObservation(supabase, sessionId, userId) : null;
    const history = mode === "refresh" ? clampHistory(body.history, 3) : [];

    // Optional delta optimization: if provided, use it; else use full dreamText.
    const rawDelta = mode === "refresh" ? sanitizeText(body.raw_delta ?? "") : "";
    const primaryText = rawDelta || dreamText;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = buildSystemPrompt();

    const userPayload = {
      mode,
      dream_text: primaryText,
      // we keep full dream for safety sanity (but instruct model to use primaryText evidence)
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
      observationRaw = await parseModelJSON(raw);
    } catch (error) {
      console.warn("observe: model call failed", error);
      return NextResponse.json({ error: "Model call failed" }, { status: 500 });
    }

    const observation = parseDreamObservation(observationRaw);
    if (!observation) {
      console.warn("observe: invalid observation payload", observationRaw);
      return NextResponse.json({ error: "Invalid observation schema" }, { status: 500 });
    }

    const { error: upsertError } = await supabase
      .from("dream_observation")
      .upsert({ session_id: sessionId, user_id: userId, obs: observation }, { onConflict: "session_id" });

    if (upsertError) return NextResponse.json({ error: "Observation write failed" }, { status: 500 });

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
