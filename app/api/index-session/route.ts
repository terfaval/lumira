// /app/api/index-session/route.ts //
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

const MAX_SUMMARY_CHARS = 800;

export async function POST(req: Request) {
  try {
    const { session_id: sessionId, dream_text: dreamTextFromBody } =
      (await req.json()) as { session_id?: string; dream_text?: string };

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const userId = authData.user.id;

    // ✅ 0) ne indexelj újra, ha már van embedding + anchor_summary
    const { data: existing, error: existingErr } = await supabase
      .from("dream_session_summaries")
      .select("anchor_summary, embedding")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingErr && existing) {
      const hasSummary = typeof existing.anchor_summary === "string" && existing.anchor_summary.trim().length > 0;
      const hasEmbedding = Boolean(existing.embedding);
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

    const dreamText = (dreamTextFromBody ?? session.raw_dream_text ?? "").trim();

    let anchorSummary = "";
    let embedding: number[] | null = null;

    if (dreamText.length >= 20) {
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
      anchorSummary = completion.replace(/\s+/g, " ").trim().slice(0, MAX_SUMMARY_CHARS);

      if (anchorSummary) {
        const embeddingResp = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: anchorSummary,
        });
        embedding = embeddingResp.data?.[0]?.embedding ?? null;
      }
    }

    const { error: upsertError } = await supabase
      .from("dream_session_summaries")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          anchor_summary: anchorSummary,
          embedding,
          // ✅ updated_at-et NE írjuk; trigger kezeli
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
