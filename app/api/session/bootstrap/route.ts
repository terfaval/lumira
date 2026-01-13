// /app/api/session/bootstrap/route.ts
//
// One-shot bootstrap for a dream session.
// Ensures (best-effort, idempotent):
// - observe (dream_observation)
// - index-session (anchor_summary + embedding)
// - synthesize (latent_analysis in dream_session_summaries)
// - frame (title + framing + recommended_directions)
//
// Goal: UI calls ONE endpoint after save.
// This endpoint forwards auth cookies/headers to internal API calls.

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  session_id?: string;
  force?: boolean; // optional: force refresh of all artifacts
};

function forwardHeaders(req: Request): Record<string, string> {
  const cookie = req.headers.get("cookie") ?? "";
  const authorization = req.headers.get("authorization") ?? "";
  const h: Record<string, string> = { "content-type": "application/json" };
  if (cookie) h.cookie = cookie;
  if (authorization) h.authorization = authorization;
  return h;
}

async function safePost(req: Request, path: string, body: any) {
  const url = new URL(path, req.url).toString();
  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: forwardHeaders(req),
      body: JSON.stringify(body),
    });
    const ok = res.ok;
    const text = await res.text().catch(() => "");
    return { ok, status: res.status, text: text.slice(0, 800) };
  } catch (e: any) {
    return { ok: false, status: 0, text: String(e?.message ?? e).slice(0, 800) };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
    const force = Boolean(body.force);

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    // Auth check + load raw dream text once (so we can pass dream_text optionally).
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    const { data: session, error: sErr } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sErr || !session) return NextResponse.json({ error: sErr?.message ?? "Session not found" }, { status: 404 });

    const dreamText = String(session.raw_dream_text ?? "").trim();

    // 0) Start index in parallel (non-blocking for initial framing)
    const indexPromise = safePost(req, "/api/index-session", {
      session_id: sessionId,
      dream_text: dreamText,
      force,
    });

    // 1) Observe first (primary truth for synth/frame)
    const observe = await safePost(req, "/api/observe", {
      session_id: sessionId,
      dream_text: dreamText,
      force,
    });

    // 2) Synthesize after observe (so latent can rely on observation)
    const synth = await safePost(req, "/api/synthesize", {
      session_id: sessionId,
      dream_text: dreamText,
      force,
    });

    // 3) Frame after synth (and observe already done) — also forward force
    const frame = await safePost(req, "/api/frame", {
      sessionId,
      force, // ✅ important: let frame know we are forcing refresh
    });

    // 4) Await index last (best-effort)
    const index = await indexPromise;

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      did: {
        observe: observe.ok,
        index_session: index.ok,
        synthesize: synth.ok,
        frame: frame.ok,
      },
      debug: {
        observe: { status: observe.status, ok: observe.ok, msg: observe.ok ? null : observe.text },
        index: { status: index.status, ok: index.ok, msg: index.ok ? null : index.text },
        synth: { status: synth.status, ok: synth.ok, msg: synth.ok ? null : synth.text },
        frame: { status: frame.status, ok: frame.ok, msg: frame.ok ? null : frame.text },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
