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
              "You write concise, literal summaries of dream texts for indexing. " +
              "No interpretation, no meaning, no diagnosis. Output plain text only.",
          },
          {
            role: "user",
            content: [
              "Create a concise anchor summary of the dream with these constraints:",
              "- Max 800 characters.",
              "- Describe only observable elements: characters, places, objects, scene shifts, explicit emotion words.",
              "- Do NOT interpret or explain meanings; avoid phrases like 'this means', 'suggests', 'represents', or any diagnoses.",
              "- Output plain text only.",
              "",
              "Dream text:",
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
          created_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
