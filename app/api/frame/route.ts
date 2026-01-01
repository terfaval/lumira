import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // 0) legyen bejelentkezve (később úgyis kiveszed az anon-t)
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1) nyers álom (RLS védi)
    const { data: session, error: readErr } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text")
      .eq("id", sessionId)
      .single();

    if (readErr || !session) {
      return NextResponse.json(
        { error: readErr?.message ?? "Session not found" },
        { status: 404 }
      );
    }

    const raw = session.raw_dream_text ?? "";

    // 2) OpenAI framing
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = [
      "Feladat: rövid, nem-értelmező, biztonságos keretező reakció egy nyers álomleírásra.",
      "Követelmények:",
      "- 2–5 mondat",
      "- ne diagnosztizálj, ne mondd meg a jelentést, ne patologizálj",
      "- tükrözz vissza 1–2 feltűnő elemet vagy hangulatot",
      "- bátoríts finoman a következő lépésre",
      "- magyar nyelven",
      "",
      "Nyers álom:",
      raw,
    ].join("\n");

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const framing = resp.choices?.[0]?.message?.content?.trim() ?? "";
    const audit = { model: resp.model, usage: resp.usage ?? null };

    // 3) visszaírjuk (RLS védi)
    const { error: updErr } = await supabase
      .from("dream_sessions")
      .update({
        ai_framing_text: framing,
        ai_framing_audit: audit,
        status: "framed",
      })
      .eq("id", sessionId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId, framing });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
