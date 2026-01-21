// /app/api/anchors/rank/route.ts
//
// Route handler to collect and rank anchors (kulcspontok) for a given dream
// session.  This endpoint aggregates anchors from latent analysis and the
// synthesizer, cross‑references them with the user's dream glossary and
// history, and returns a scored list of anchor candidates.  It can be
// consumed by both the frame and work modules to ensure consistent anchor
// selection.

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { rankAnchors } from "@/src/lib/dream/anchorRanking";
import { fetchLatentLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Expected request body for the anchor ranking endpoint.
 *
 * @property session_id   Identifier of the dream session (required).
 * @property dream_text   Raw dream text (required).  Used to count anchor occurrences.
 * @property history      Optional array of previous questions/answers.  Used to avoid
 *                        reusing anchors that have already been asked about.
 */
type RankRequest = {
  session_id?: string;
  dream_text?: string;
  history?: { question: string; answer?: string | null }[];
};

/**
 * POST handler for the anchor ranking API.  This endpoint authenticates the user,
 * loads the latent analysis from the database (falling back to synthesizer if
 * necessary), collects anchors, applies scoring and returns the ranked list.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RankRequest;
    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
    const dreamText = typeof body.dream_text === "string" ? body.dream_text.trim() : undefined;

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    if (!dreamText) return NextResponse.json({ error: "Missing dream_text" }, { status: 400 });

    // Authenticate user and obtain supabase client scoped to their session/cookies.
    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = authData.user.id;

    // Fetch latent payload from latest (if present). If missing, latent remains null.
    let latent: any | null = null;
    try {
      const latest = await fetchLatentLatestWithPayloadAndId(supabase, userId, sessionId);
      if (latest?.payload && typeof latest.payload === "object") latent = latest.payload;
    } catch (e: any) {
      console.warn("rank anchors: DB latent fetch failed", e?.message ?? e);
    }

    // Optional synthesizer fallback.  If no latent_analysis is present we call
    // the existing /api/synthesize endpoint to obtain anchors.  We pass along
    // session_id, dream_text and history.  A failure here is non‑fatal; synth
    // remains null and ranking will rely solely on latent.
    let synth: any | null = null;
    if (!latent) {
      try {
        const url = new URL("/api/synthesize", req.url).toString();
        const cookieHeader = req.headers.get("cookie") ?? "";
        const authHeader = req.headers.get("authorization") ?? "";
        const res = await fetch(url, {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            ...(authHeader ? { authorization: authHeader } : {}),
          },
          body: JSON.stringify({
            session_id: sessionId,
            dream_text: dreamText,
            history: Array.isArray(body.history) ? body.history : [],
            prior_echoes: [],
            allowed_slugs: [],
          }),
        });
        if (res.ok) {
          synth = (await res.json().catch(() => null)) ?? null;
        }
      } catch (e: any) {
        console.warn("rank anchors: synth fallback failed", e?.message ?? e);
      }
    }

    // Extract previous questions from history to avoid repeating anchors.  Only
    // string questions are considered.  The rankAnchors helper handles case
    // normalisation and matching.
    const prevQuestions = Array.isArray(body.history)
      ? body.history
          .map((h) => (typeof h?.question === "string" ? h.question.trim() : ""))
          .filter((q) => q)
      : [];

    // Compute ranked anchors.  We limit the number returned to 16 by default
    // (larger lists could overwhelm the UI).  The helper queries the glossary
    // internally, applies scoring and filters out used anchors.
    const anchors = await rankAnchors({
      supabase,
      userId,
      dreamText,
      latent,
      synth,
      prevQuestions,
      includeUsed: false,
      maxCount: 16,
    });

    return NextResponse.json({ session_id: sessionId, anchors });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
