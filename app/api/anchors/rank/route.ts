// /app/api/anchors/rank/route.ts
//
// v0 Route: ranks anchors for a session.
// - Fetches dream text from DB if not provided
// - Fetches observation payload via observation_latest -> observation_versions
// - Fetches latent payload via latent_latest -> latent_versions
// - Calls rankAnchors() (observation-first)

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { rankAnchors } from "@/src/lib/dream/anchorRanking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankRequest = {
  session_id?: string;
  dream_text?: string;
  history?: { question: string; answer?: string | null }[];
  maxCount?: number;
};

function sanitizeText(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

async function fetchSessionDreamText(supabase: any, sessionId: string, userId: string): Promise<string | null> {
  const { data: entry, error } = await supabase
    .from("dream_entries")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("kind", "raw")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !entry) return null;
  return sanitizeText(entry.content ?? "");
}

async function fetchObservationPayload(supabase: any, sessionId: string, userId: string): Promise<any | null> {
  const { data: latest, error: latestErr } = await supabase
    .from("observation_latest")
    .select("observation_version_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (latestErr || !latest?.observation_version_id) return null;

  const { data: ver, error: verErr } = await supabase
    .from("observation_versions")
    .select("payload")
    .eq("id", latest.observation_version_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (verErr) return null;
  return ver?.payload ?? null;
}

async function fetchLatentPayload(supabase: any, sessionId: string, userId: string): Promise<any | null> {
  const { data: latest, error: latestErr } = await supabase
    .from("latent_latest")
    .select("latent_version_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (latestErr || !latest?.latent_version_id) return null;

  const { data: ver, error: verErr } = await supabase
    .from("latent_versions")
    .select("payload")
    .eq("id", latest.latent_version_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (verErr) return null;
  return ver?.payload ?? null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RankRequest;

    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = authData.user.id;

    // Dream text: either from body or DB
    let dreamText = sanitizeText(typeof body.dream_text === "string" ? body.dream_text : "");
    if (!dreamText) {
      const fromDb = await fetchSessionDreamText(supabase, sessionId, userId);
      if (!fromDb) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      dreamText = fromDb;
    }

    const prevQuestions = Array.isArray(body.history)
      ? body.history
          .map((h) => (typeof h?.question === "string" ? h.question.trim() : ""))
          .filter(Boolean)
      : [];

    // Load observation + latent payloads (best-effort)
    const [observation, latent] = await Promise.all([
      fetchObservationPayload(supabase, sessionId, userId),
      fetchLatentPayload(supabase, sessionId, userId),
    ]);

    const anchors = await rankAnchors({
      supabase,
      userId,
      dreamText,
      observation,
      latent,
      prevQuestions,
      includeUsed: false,
      maxCount: typeof body.maxCount === "number" ? body.maxCount : 16,
    });

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      anchors,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
