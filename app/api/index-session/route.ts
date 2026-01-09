// /app/api/index-session/route.ts (patched v4 – tail-first clamp)
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
  dream_text?: string;
  force?: boolean;
};

function sanitize(t: string): string {
  return (t ?? "").replace(/\s+/g, " ").trim();
}

// Mondatokra bontás (pont, kérdő, felkiáltó, ellipszis), megtartva a jelet
function splitSentences(s: string): string[] {
  const t = sanitize(s);
  const parts: string[] = [];
  let acc = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    acc += ch;
    if (/[.!?]/.test(ch) || (ch === "…" && (i === t.length - 1 || t[i + 1] === " "))) {
      parts.push(acc.trim());
      acc = "";
    }
  }
  if (acc.trim()) parts.push(acc.trim());
  return parts.filter(Boolean);
}

// Ha túl hosszú: a VÉGÉT preferáljuk: hátrafelé gyűjtünk mondatokat a limitig, majd megfordítjuk.
function clampSummaryPreferTail(s: string, max = MAX_SUMMARY_CHARS): string {
  const t = sanitize(s);
  if (t.length <= max) return t;
  const sentences = splitSentences(t);
  if (sentences.length === 0) return t.slice(-max);

  const tail: string[] = [];
  let total = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const seg = sentences[i];
    const cost = (tail.length ? 1 : 0) + seg.length; // szóköz a mondatok közt
    if (total + cost > max) break;
    tail.push(seg);
    total += cost;
  }
  const kept = tail.reverse().join(" ");
  // Ha nagyon kevés fért be, tegyünk elé ellipszist, hogy érződjön a rövidítés
  return (sentences.length > tail.length ? "… " : "") + kept;
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

    const { data: session, error: sessionError } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, user_id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
    }

    const dreamText = sanitize((body.dream_text ?? session.raw_dream_text ?? ""));

    if (dreamText.length < MIN_DREAM_LEN) {
      const { error: upsertShortErr } = await supabase
        .from("dream_session_summaries")
        .upsert(
          { session_id: sessionId, user_id: userId, anchor_summary: "", embedding: null },
          { onConflict: "session_id" }
        );
      if (upsertShortErr) {
        return NextResponse.json({ error: upsertShortErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, skipped: false, too_short: true });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ➤ Prompt: utolsó mondat = zárójelenet
    const sys =
      "Magyar nyelvű, tömör HORGONY-összefoglalót írsz álmok indexeléséhez.\n" +
      "- Olvasd el az EGÉSZ dream_text-et.\n" +
      "- Sorold a megfigyelhető eseteket (szereplők, HELYEK – tulajdonnevek ékezettel!, tárgyak, JELENETVÁLTÁSOK, kifejezett érzelemszavak) ELEJE–KÖZEPE–VÉGE rendben.\n" +
      "- AZ UTOLSÓ MONDAT KÖTELEZŐEN ÍRJA LE A ZÁRÓJELENETET (hely és esemény).\n" +
      "- NE értelmezz, NE diagnosztizálj, NE szimbólummagyarázz.\n" +
      `- Teljes kimenet max ${MAX_SUMMARY_CHARS} karakter, PLAIN SZÖVEG (nincs lista).`;

    const userMsg = [
      "Készíts magyar, tömör, kronologikus horgony-összefoglalót az alábbi álomról.",
      "Fókusz: konkrét helyek (tulajdonnevek ékezettel), használt eszközök/tárgyak, jelenetváltások, kifejezett érzelemszavak.",
      "Az utolsó mondat a zárójelenet rövid leírása legyen (hol és mi történik).",
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
        15000
      );
      const raw = summaryResp.choices?.[0]?.message?.content ?? "";
      // ha mégis túl hosszú, a véget preferáljuk
      anchorSummary = clampSummaryPreferTail(raw, MAX_SUMMARY_CHARS);
    } catch {
      // fallback: az eredeti álom végét preferáljuk
      const tail = dreamText.slice(Math.max(0, dreamText.length - 1200));
      anchorSummary = clampSummaryPreferTail(tail, Math.min(MAX_SUMMARY_CHARS, 320));
    }

    // 4) Embedding
    let embedding: number[] | null = null;
    if (anchorSummary) {
      try {
        const emb = await withTimeout(
          (signal) =>
            openai.embeddings.create(
              { model: EMBEDDING_MODEL, input: anchorSummary },
              { signal }
            ),
          15000
        );
        embedding = emb.data?.[0]?.embedding ?? null;
      } catch {
        embedding = null;
      }
    }

    // 5) Upsert
    const { error: upsertError } = await supabase
      .from("dream_session_summaries")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          anchor_summary: anchorSummary,
          embedding,
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
