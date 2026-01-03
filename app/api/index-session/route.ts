// /app/api/index-session/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

const MAX_SUMMARY_CHARS = 800;
const MIN_DREAM_LEN = 20;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { session_id?: string; dream_text?: string };
    const sessionId = body.session_id;
    const dreamTextFromBody = body.dream_text;

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const userId = authData.user.id;

    // 0) Ne indexelj újra, ha már megvan az anchor + embedding
    const { data: existing, error: existingErr } = await supabase
      .from("dream_session_summaries")
      .select("anchor_summary, embedding")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingErr && existing) {
      const hasSummary = typeof existing.anchor_summary === "string" && existing.anchor_summary.trim().length > 0;
      const hasEmbedding = existing.embedding !== null && existing.embedding !== undefined;
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

    const dreamText = (dreamTextFromBody ?? session.raw_dream_text ?? "").trim();

    // 2) Ha túl rövid, akkor nem gyártunk summary/embeddinget,
    // de a row létezését opcionálisan biztosíthatjuk (nem kötelező).
    if (dreamText.length < MIN_DREAM_LEN) {
      // biztosítsuk, hogy legyen row (később a frame úgyis upsertel title/framing/reco-t)
      const { error: upsertShortErr } = await supabase
        .from("dream_session_summaries")
        .upsert(
          {
            session_id: sessionId,
            user_id: userId,
            anchor_summary: "",
            embedding: null,
          },
          { onConflict: "session_id" }
        );

      if (upsertShortErr) return NextResponse.json({ error: upsertShortErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, skipped: false, too_short: true });
    }

    // 3) Anchor summary + embedding
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const summaryResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Magyar nyelvű, tömör, szó szerinti horgony-összefoglalót írsz álmokhoz indexeléshez. " +
            "Nem értelmezel, nem magyarázol, nem diagnosztizálsz. Kimenet: csak sima szöveg.",
        },
        {
          role: "user",
          content: [
            "Készíts egy magyar, tömör horgony-összefoglalót a következő megkötésekkel:",
            "- Max 800 karakter.",
            "- Csak megfigyelhető elemek: szereplők, helyek, tárgyak, jelenetváltások, kifejezett érzelemszavak.",
            "- Ne értelmezz; ne legyen: „ez azt jelenti”, „arra utal”, „szimbolizál”, diagnózis.",
            "- Kimenet: csak a szöveg.",
            "",
            "Álom szöveg:",
            dreamText,
          ].join("\n"),
        },
      ],
    });

    const completion = summaryResp.choices?.[0]?.message?.content?.trim() ?? "";
    const anchorSummary = completion.replace(/\s+/g, " ").trim().slice(0, MAX_SUMMARY_CHARS);

    let embedding: number[] | null = null;
    if (anchorSummary) {
      const embeddingResp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: anchorSummary,
      });
      embedding = embeddingResp.data?.[0]?.embedding ?? null;
    }

    // 4) Upsert: CSAK anchor_summary + embedding mezők
    const { error: upsertError } = await supabase
      .from("dream_session_summaries")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          anchor_summary: anchorSummary,
          embedding,
          // updated_at-et nem írjuk (trigger)
        },
        { onConflict: "session_id" }
      );

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

    return NextResponse.json({ ok: true, skipped: false });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
