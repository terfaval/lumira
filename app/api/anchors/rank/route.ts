// app/api/anchors/rank/route.ts
//
// v0 Route: ranks anchors for a session.
// - Fetches dream text from DB if not provided
// - Fetches observation payload via observation_latest -> observation_versions
// - Fetches latent payload via latent_latest -> latent_versions
// - Calls rankAnchors() (observation-first)
// - Persists results into dream_anchor_versions + dream_anchor_latest (idempotent via input_hash)

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { ensureAnchorsRanked } from "@/src/orchestration/ensureAnchorsRanked";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankRequest = {
  session_id?: string;
  maxCount?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RankRequest;

    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = authData.user.id;

    const ensured = await ensureAnchorsRanked(supabase, { user_id: userId, session_id: sessionId });
    if (!ensured.anchor_version_id || !ensured.payload) {
      return NextResponse.json({ error: "Anchor ranking unavailable" }, { status: 404 });
    }

    const maxCount = typeof body.maxCount === "number" && body.maxCount > 0 ? body.maxCount : undefined;
    const topKeys = maxCount ? ensured.payload.top_keys.slice(0, maxCount) : ensured.payload.top_keys;

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      anchor_version_id: ensured.anchor_version_id,
      anchors: ensured.payload.anchors,
      top_keys: topKeys,
      meta: ensured.payload.meta,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
