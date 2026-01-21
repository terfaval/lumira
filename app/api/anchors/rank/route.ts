// app/api/anchors/rank/route.ts
//
// v0 Route: ranks anchors for a session.
// - Fetches dream text from DB if not provided
// - Fetches observation payload via observation_latest -> observation_versions
// - Fetches latent payload via latent_latest -> latent_versions
// - Calls rankAnchors() (observation-first)
// - Persists results into anchor_versions + anchor_latest (idempotent via input_hash)

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { rankAnchors } from "@/src/lib/dream/anchorRanking";
import { insertAnchorVersionIfMissing, upsertAnchorLatest } from "@/src/db/repositories/anchorRepo";
import { sha256, materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";

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

function clampPrevQuestions(history: unknown, max = 6): string[] {
  if (!Array.isArray(history)) return [];
  const qs = history
    .map((h: any) => (typeof h?.question === "string" ? h.question.trim() : ""))
    .filter(Boolean);
  return qs.slice(-max);
}

async function fetchSessionDreamText(supabase: any, sessionId: string, userId: string): Promise<string | null> {
  const { data: entry, error } = await supabase
    .from("dream_entries")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .in("kind", ["raw", "raw_entry"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !entry) return null;
  return sanitizeText(entry.content ?? "");
}

async function fetchObservationPayload(supabase: any, sessionId: string, userId: string): Promise<any | null> {
  const { data: latest } = await supabase
    .from("observation_latest")
    .select("observation_version_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!latest?.observation_version_id) return null;

  const { data: ver } = await supabase
    .from("observation_versions")
    .select("payload")
    .eq("id", latest.observation_version_id)
    .eq("user_id", userId)
    .maybeSingle();

  return ver?.payload ?? null;
}

async function fetchLatentPayload(supabase: any, sessionId: string, userId: string): Promise<any | null> {
  const { data: latest } = await supabase
    .from("latent_latest")
    .select("latent_version_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!latest?.latent_version_id) return null;

  const { data: ver } = await supabase
    .from("latent_versions")
    .select("payload")
    .eq("id", latest.latent_version_id)
    .eq("user_id", userId)
    .maybeSingle();

  return ver?.payload ?? null;
}

function buildAnchorInputHash(params: {
  sessionId: string;
  dreamText: string;
  observation: any | null;
  latent: any | null;
  prevQuestions: string[];
  maxCount: number;
}): string {
  const material = materialHashFromPayload({
    session_id: params.sessionId,
    dream_text: params.dreamText,
    observation: params.observation ?? null,
    latent: params.latent ?? null,
    prev_questions: params.prevQuestions,
    maxCount: params.maxCount,
  });
  return sha256(`anchor_rank:${material}`);
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

    const prevQuestions = clampPrevQuestions(body.history, 6);

    // Load observation + latent payloads (best-effort)
    const [observation, latent] = await Promise.all([
      fetchObservationPayload(supabase, sessionId, userId),
      fetchLatentPayload(supabase, sessionId, userId),
    ]);

    const maxCount = typeof body.maxCount === "number" && body.maxCount > 0 ? body.maxCount : 16;

    const anchors = await rankAnchors({
      supabase,
      userId,
      dreamText,
      observation,
      latent,
      prevQuestions,
      includeUsed: false,
      maxCount,
    });

    // Persist anchors to v0 tables (idempotent)
    const input_hash = buildAnchorInputHash({
      sessionId,
      dreamText,
      observation,
      latent,
      prevQuestions,
      maxCount,
    });

    const saved = await insertAnchorVersionIfMissing(supabase, {
      session_id: sessionId,
      user_id: userId,
      input_hash,
      model: "ranking_v0", // string kell, ne null
      payload: {
        anchors,
        meta: {
          maxCount,
          prevQuestionsCount: prevQuestions.length,
          hasObservation: Boolean(observation),
          hasLatent: Boolean(latent),
        },
      },
    });

    await upsertAnchorLatest(supabase, {
      session_id: sessionId,
      user_id: userId,
      anchor_version_id: saved.id,
    });

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      anchors,
      anchor_version_id: saved.id,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
