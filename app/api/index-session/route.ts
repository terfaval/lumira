// /app/api/index-session/route.ts (patched v2)
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

const MAX_SUMMARY_CHARS = 800;
const MIN_DREAM_LEN = 20;
const SUMMARIZE_MODEL = "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TEMPERATURE = 0;

type ReqBody = {
  session_id?: string;
  dream_text?: string;   // opcionális, ha a kliens már küldi
  force?: boolean;       // új: kényszerített újraindexelés
};

function sanitize(t: string): string {
  return (t ?? "").replace(/\s+/g, " ").trim();
}

function safeClip(t: string, maxChars: number): string {
  const s = sanitize(t);
  return s.length > maxChars ? s.slice(0, maxChars) : s;
}

function isNonEmpty(s: unknown): boolean {
  return typeof s === "string" && s.trim().length > 0;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const sessionId = body.session_id;
    const force = Boolean(body.force);

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    // 0) SKIP-őr: csak ha tényleg kész (és nincs force)
    if (!force) {
      const { data: existing } = await supabase
        .from("dream_session_summaries")
        .select("anchor_summary, embedding")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      const hasSummary = isNonEmpty(existing?.anchor_summary);
      const hasEmbedding = existing?.embedding !== null && existing?.embedding !== undefined;

      if (hasSummary && hasEmbedding) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    // 1) Session betöltés (owner check)
    const { data: session, error: sessionError } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, user_id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
    }

    // A tényleges input szöveg: ha a kliens küldte, azt használjuk, különben DB
    const dreamText = sanitize((body.dream_text ?? session.raw_dream_text ?? ""));

    // 2) Rövid álmok: legyen sor, de ne gyártsunk összefoglalót/embeddinget
    if (dreamText.length < MIN_DREAM_LEN) {
      const { error: upsertShortErr } = await supabase
        .from("dream_session_summaries")
        .upsert(
          {
            session_id: sessionId,
            user_id: userId,
            anchor_summary: "",
            embedding: null,
          },
          // fontos: session_id + user_id
          { onConflict: "session_id" }
        );

      if (upsertShortErr) {
        return NextResponse.json({ error: upsertShortErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, skipped: false, too_short: true });
    }

    // 3) Modell: horgony-összefoglaló (sima szöveg, kronológia, tulajdonnevek)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const sys =
      "Magyar nyelvű, tömör HORGONY-összefoglalót írsz álmokhoz INDEXELÉSHEZ.\n" +
      "- Olvasd el az EGÉSZ dream_text-et (ne csak az elejét).\n" +
      "- Csak megfigyelhető ESETEKET sorolj (szereplők, HELYEK – tulajdonnevek ékezettel!, tárgyak, JELENETVÁLTÁSOK, kifejezett érzelemszavak).\n" +
      "- Legyen benne az ELEJE–KÖZEPE–VÉGE logika és ha van, a ZÁRÓ JELENET helye/eseménye.\n" +
      "- NE értelmezz, NE diagnosztizálj, NE szimbólum-magyarazat. Csak tényszerű, rövid mondatok.\n" +
      `- Max ${MAX_SUMMARY_CHARS} karakter.\n` +
      "- Kimenet: CSAK PLAIN SZÖVEG.";

    const userMsg =
      [
        "Készíts magyar, tömör, kronologikus horgony-összefoglalót az alábbi álomról.",
        "Fókusz: konkrét helyek (tulajdonnevek ékezettel), használt eszközök/tárgyak, jelenetváltások, kifejezett érzelemszavak.",
        "Ne adj értelmezést, diagnózist vagy tanácsot.",
        "",
        "Álom szöveg:",
        dreamText,
      ].join("\n");

    let anchorSummary = "";
    try {
      const summaryResp = await withTimeout(
        (signal) =>
          openai.chat.completions.create(
            {
              model: SUMMARIZE_MODEL,
              temperature: DEFAULT_TEMPERATURE,
              messages: [
                { role: "system", content: sys },
                { role: "user", content: userMsg },
              ],
            },
            { signal }
          ),
        10000
      );
      anchorSummary = safeClip(summaryResp.choices?.[0]?.message?.content ?? "", MAX_SUMMARY_CHARS);
    } catch (e) {
      // ha bármi gáz, legyen óvatos fallback (tiszta clip)
      anchorSummary = safeClip(dreamText, Math.min(MAX_SUMMARY_CHARS, 320));
    }

    // 4) Embedding (csak ha van mit indexelni)
    let embedding: number[] | null = null;
    if (anchorSummary) {
      try {
        const emb = await withTimeout(
          (signal) =>
            openai.embeddings.create(
              { model: EMBEDDING_MODEL, input: anchorSummary },
              { signal }
            ),
          10000
        );
        embedding = emb.data?.[0]?.embedding ?? null;
      } catch {
        embedding = null;
      }
    }

    // 5) Upsert (csak az index-mezők) — fontos az összetett onConflict
    const { error: upsertError } = await supabase
      .from("dream_session_summaries")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          anchor_summary: anchorSummary,
          embedding,
          // updated_at handled by trigger (ha van)
        },
        { onConflict: "session_id" }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      summary_len: anchorSummary.length,
      has_embedding: Boolean(embedding),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
