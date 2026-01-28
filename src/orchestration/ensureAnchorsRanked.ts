import { SupabaseClient } from "@supabase/supabase-js";
import { rankAnchors, buildAnchorRankingPayload } from "@/src/lib/dream/anchorRanking";
import { insertAnchorVersionIfMissing, upsertAnchorLatest } from "@/src/db/repositories/anchorRepo";
import { fetchLatentLatestWithPayloadAndId, fetchObservationLatestV0WithPayloadAndId } from "@/src/db/repositories/latestRepo";
import { listRecentAnchorKeys } from "@/src/db/repositories/workQuestionLedgerRepo";
import { materialHashFromPayload, sha256 } from "@/src/orchestration/idempotency/materialHash";

const ALGORITHM_VERSION = "v1";
const TOP_KEYS_LIMIT = 16;

function sanitizeText(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

async function fetchDreamText(supabase: SupabaseClient, sessionId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("dream_entries")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    // v0 clean schema: kind in ('raw','dictation','edit','note')
    // anchor ranking should prefer the latest "raw" (or fallback to latest entry if you want).
    .in("kind", ["raw"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const text = typeof data.content === "string" ? data.content : "";
  return sanitizeText(text);
}

function buildAnchorInputHash(params: {
  dreamTextHash: string;
  observationVersionId: string | null;
  latentVersionId: string | null;
  usedAnchorKeysHash: string;
}): string {
  return sha256(
    [
      "anchor_rank",
      params.dreamTextHash,
      params.observationVersionId ?? "none",
      params.latentVersionId ?? "none",
      params.usedAnchorKeysHash,
      ALGORITHM_VERSION,
    ].join(":")
  );
}

export async function ensureAnchorsRanked(
  supabase: SupabaseClient,
  params: { user_id: string; session_id: string }
): Promise<{ anchor_version_id: string | null; payload: any | null; input_hash: string | null }> {
  const dreamText = await fetchDreamText(supabase, params.session_id, params.user_id);
  if (!dreamText) return { anchor_version_id: null, payload: null, input_hash: null };

  const [observationLatest, latentLatest, recentAnchorKeys] = await Promise.all([
    fetchObservationLatestV0WithPayloadAndId(supabase, params.user_id, params.session_id),
    fetchLatentLatestWithPayloadAndId(supabase, params.user_id, params.session_id),
    listRecentAnchorKeys(supabase, { session_id: params.session_id, user_id: params.user_id, limit: 120 }),
  ]);

  const observationPayload = observationLatest?.payload ?? null;

  const latentPayload = latentLatest?.payload ?? null;

  const usedAnchorKeys = Array.from(new Set((recentAnchorKeys ?? []).map((k) => k.trim()).filter(Boolean))).sort();

  const input_hash = buildAnchorInputHash({
    dreamTextHash: sha256(dreamText),
    observationVersionId: observationLatest?.observation_version_id ?? null,
    latentVersionId: latentLatest?.latent_version_id ?? null,
    usedAnchorKeysHash: sha256(materialHashFromPayload(usedAnchorKeys)),
  });

  const anchors = await rankAnchors({
    supabase,
    userId: params.user_id,
    sessionId: params.session_id,
    dreamText,
    observation: observationPayload,
    latent: latentPayload,
    usedAnchorKeys,
    includeUsed: false,
  });

  const payload = buildAnchorRankingPayload({
    anchors,
    input_hash,
    topCount: TOP_KEYS_LIMIT,
    usedAnchorKeys,
    hasObservation: Boolean(observationPayload),
    hasLatent: Boolean(latentPayload),
  });

  const saved = await insertAnchorVersionIfMissing(supabase, {
    session_id: params.session_id,
    user_id: params.user_id,
    input_hash,
    payload,
  });

  // v0 clean schema: dream_anchor_latest stores only version_id (pointer)
  await upsertAnchorLatest(supabase, {
    session_id: params.session_id,
    user_id: params.user_id,
    anchor_version_id: saved.id,
  });

  return { anchor_version_id: saved.id, payload, input_hash };
}
