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

type RequestBody = {
  session_id?: string;
  dream_text?: string;
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

function buildSystemPrompt(): string {
  return [
    "You extract non-interpretive observations from a dream description.",
    "Return ONLY valid JSON that follows the schema exactly. No markdown.",
    "",
    "Forbidden outputs:",
    "- interpretation, meaning, or diagnosis",
    "- advice, instructions, or therapy language",
    "- authoritative claims about the user",
    "- symbolism dictionaries or psychoanalysis",
    "",
    "Schema (all keys required):",
    "{",
    '  "entities": {',
    '    "characters": [{"label": "...", "evidence": ["..."]}],',
    '    "places": [{"label": "...", "evidence": ["..."]}],',
    '    "objects": [{"label": "...", "evidence": ["..."]}],',
    '    "other": [{"label": "...", "evidence": ["..."]}]',
    "  },",
    '  "motifs": [{"label": "...", "evidence": ["..."]}],',
    '  "tone": [{"label": "...", "evidence": ["..."]}],',
    '  "structure": [{"label": "...", "evidence": ["..."]}],',
    '  "body": [{"label": "...", "evidence": ["..."]}],',
    '  "safety": { "flag": "none|distress|reality_confusion|self_harm", "evidence": ["..."] }',
    "}",
    "",
    "Evidence must be short quotes or tight paraphrases from the dream text.",
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const sessionId = body.session_id;
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    let dreamText = sanitizeText(body.dream_text ?? "");
    if (!dreamText) {
      const { data: session, error: sessionError } = await supabase
        .from("dream_sessions")
        .select("id, raw_dream_text, user_id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
      }

      dreamText = sanitizeText(session.raw_dream_text ?? "");
    }

    if (dreamText.length < MIN_DREAM_LEN) {
      const empty = emptyDreamObservation();
      const { error: upsertError } = await supabase
        .from("dream_observation")
        .upsert({ session_id: sessionId, user_id: userId, obs: empty }, { onConflict: "session_id" });
      if (upsertError) {
        console.warn("observe: upsert empty observation failed", upsertError.message);
        return NextResponse.json({ error: "Observation write failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, session_id: sessionId, has_obs: true });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = buildSystemPrompt();
    const userPayload = {
      dream_text: dreamText,
      guidance: "List observable elements only. No interpretation.",
    };

    let observationRaw: unknown = null;
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
              max_tokens: 900,
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
    if (upsertError) {
      console.warn("observe: upsert observation failed", upsertError.message);
      return NextResponse.json({ error: "Observation write failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      has_obs: true,
      observation: compactDreamObservation(observation),
    });
  } catch (error) {
    console.warn("observe: handler exception", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
