import { SupabaseClient } from "@supabase/supabase-js";
import { rankAnchors, buildAnchorRankingPayload } from "@/src/lib/dream/anchorRanking";
import { insertAnchorVersionIfMissing, upsertAnchorLatest } from "@/src/db/repositories/anchorRepo";
import { fetchObservationLatestWithPayloadAndId, fetchLatentLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";
import { fetchUsedAnchorKeysFromLedger } from "@/src/lib/dream/workLedger";
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
    .in("kind", ["raw", "raw_entry"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const text = typeof data.content === "string" ? data.content : "";
  return sanitizeText(text);
}

async function fetchSummaryLatent(supabase: SupabaseClient, sessionId: string, userId: string): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("dream_session_summaries")
      .select("latent_analysis")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    return data?.latent_analysis ?? null;
  } catch {
    return null;
  }
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

  const [observationLatest, latentLatest, summaryLatent, usedAnchorKeysSet] = await Promise.all([
    fetchObservationLatestWithPayloadAndId(supabase, params.user_id, params.session_id),
    fetchLatentLatestWithPayloadAndId(supabase, params.user_id, params.session_id),
    fetchSummaryLatent(supabase, params.session_id, params.user_id),
    fetchUsedAnchorKeysFromLedger({ supabase, sessionId: params.session_id, userId: params.user_id, limit: 120 }),
  ]);

  const observationPayload = observationLatest?.payload ?? null;
  const latentPayload = latentLatest?.payload ?? summaryLatent ?? null;

  const usedAnchorKeys = Array.from(usedAnchorKeysSet ?? new Set<string>())
    .map((k) => k.trim())
    .filter(Boolean)
    .sort();

  const input_hash = buildAnchorInputHash({
    dreamTextHash: sha256(dreamText),
    observationVersionId: observationLatest?.observation_version_id ?? null,
    latentVersionId: latentLatest?.latent_version_id ?? null,
    usedAnchorKeysHash: sha256(materialHashFromPayload(usedAnchorKeys)),
  });

  const anchors = await rankAnchors({
    supabase,
    userId: params.user_id,
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

  await upsertAnchorLatest(supabase, {
    session_id: params.session_id,
    user_id: params.user_id,
    anchor_version_id: saved.id,
    payload,
  });

  return { anchor_version_id: saved.id, payload, input_hash };
}
