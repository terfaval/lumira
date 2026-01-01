import OpenAI from "openai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const authHeader = req.headers.get("authorization") ?? undefined;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options?: any) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: session } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, ai_framing_text, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.ai_framing_text && session.status === "framed") {
      return NextResponse.json({ sessionId, framing: session.ai_framing_text });
    }

    const raw = session.raw_dream_text?.trim() ?? "";
    if (raw.length < 20) {
      const framing =
        "Az álomleírás nagyon rövid, de fontos, hogy időt szánj rá: " +
        "pár mondatban írd le, mi történt és milyen érzések kísérték. Folytasd, amikor készen állsz.";

      const { error: updErr } = await supabase
        .from("dream_sessions")
        .update({
          ai_framing_text: framing,
          ai_framing_audit: { model: "fallback", usage: null },
          status: "framed",
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ sessionId, framing });
    }

    // 2) OpenAI framing
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Adj rövid, 2–5 mondatos magyar keretező választ egy nyers álomleírásra. " +
            "Ne értelmezz, ne diagnosztizálj, ne patologizálj, ne utalj saját szerepedre. " +
            "Csak tükrözz vissza 1–2 feltűnő elemet vagy hangulatot, nyugodt és támogató hangnemben, " +
            "és finoman bátoríts a következő lépésre. Csak a keretezést add vissza magyarul.",
        },
        { role: "user", content: raw },
      ],
      temperature: 0.2,
      max_tokens: 220,
    });

    const framing = resp.choices?.[0]?.message?.content?.trim() ?? "";
    if (!framing) {
      return NextResponse.json({ error: "Empty framing" }, { status: 502 });
    }
    const audit = { model: resp.model, usage: resp.usage ?? null };

    // 3) visszaírjuk (RLS védi)
    const { error: updErr } = await supabase
      .from("dream_sessions")
      .update({
        ai_framing_text: framing,
        ai_framing_audit: audit,
        status: "framed",
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId, framing });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}