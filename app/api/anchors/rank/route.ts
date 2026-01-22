// app/api/anchors/rank/route.ts
//
// v0 Route: ranks anchors for a session.
// - Delegates ranking + persistence to ensureAnchorsRanked()
// - Adds robust request parsing + maxCount guardrails

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { ensureAnchorsRanked } from "@/src/orchestration/ensureAnchorsRanked";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankRequest = {
  session_id?: string;
  maxCount?: number;
};

function clampInt(n: unknown, min: number, max: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const x = Math.floor(n);
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export async function POST(req: Request) {
  try {
    let body: RankRequest;
    try {
      body = (await req.json()) as RankRequest;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) return NextResponse.json({ error: "session_id_required" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const userId = authData.user.id;

    const ensured = await ensureAnchorsRanked(supabase, { user_id: userId, session_id: sessionId });
    if (!ensured.anchor_version_id || !ensured.payload) {
      return NextResponse.json({ error: "anchor_ranking_unavailable" }, { status: 404 });
    }

    const topKeysRaw = Array.isArray(ensured.payload.top_keys) ? ensured.payload.top_keys : [];
    const maxCount = clampInt(body.maxCount, 1, 64); // UI guardrail
    const topKeys = maxCount ? topKeysRaw.slice(0, maxCount) : topKeysRaw;

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      anchor_version_id: ensured.anchor_version_id,
      anchors: ensured.payload.anchors ?? [],
      top_keys: topKeys,
      meta: ensured.payload.meta ?? null,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
