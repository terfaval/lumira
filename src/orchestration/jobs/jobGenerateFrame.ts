// src/orchestration/jobs/jobGenerateFrame.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { fetchDirectionCatalog } from "@/src/db/repositories/catalogRepo";
import {
  fetchLatentLatestWithPayloadAndId,
  fetchObservationLatestWithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { recommendDirectionsFromLatent } from "@/src/domain/directions/recommendDirectionsFromLatent";
import { generateFrameFromLatent } from "@/src/domain/frame/generateFrameFromLatent";
import { insertFrameVersionIfMissing, upsertFrameLatest } from "@/src/db/repositories/frameRepo";

function looksMojibake(s: string): boolean {
  // typical UTF-8 decoded as latin1 artifacts
  return /Ã|Å|Å±|â€™|â€œ|â€|Â/.test(String(s ?? ""));
}

function oneSentence(s: string, max = 180): string {
  const t = String(s ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  const first = t.split(/(?<=[.!?])\s+/)[0] || t;
  return first.slice(0, max);
}

function fallbackWhy(slug: string, fromCatalog?: { title?: string } | null): string {
  const label = String(fromCatalog?.title ?? "").trim() || slug;
  return `Kapcsolódó irány: ${label}.`;
}

export async function jobGenerateFrame(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
  allowFallbackWithoutLatent?: boolean; // default false (v0)
}): Promise<{
  frame_version_id: string | null;
  skipped: boolean;
  ok: boolean;
  recommended_directions: Array<{ slug: string; title: string; why: string }>;
  recommended_slugs?: string[];
}> {
  const { supabase, event, material_hash } = args;

  const obs = await fetchObservationLatestWithPayloadAndId(supabase, event.user_id, event.session_id);
  const idx = await fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id);
  if (!obs || !idx) {
    return { frame_version_id: null, skipped: false, ok: false, recommended_directions: [] };
  }

  const latentLatest = await fetchLatentLatestWithPayloadAndId(supabase, event.user_id, event.session_id);
  if (!latentLatest && !args.allowFallbackWithoutLatent) {
    return { frame_version_id: null, skipped: false, ok: false, recommended_directions: [] };
  }

  const latentWhyMap = buildWhyMapFromLatentCandidates(latentLatest?.payload?.direction_candidates);
  // Always load jobWhyMap as a cheap, useful fallback (latent can be partial).
  const jobWhyMap = await fetchLatestWhyMapFromJobs(supabase, event.user_id, event.session_id);
 

  // NOTE: v0 fallback is OFF, so dummy UUID is safe.
  // TODO(if allowFallbackWithoutLatent becomes true):
  // Do NOT use a constant dummy latent id, or you'll get false idempotency collisions.
  // Use e.g. `no_latent:${obs.observation_version_id}:${idx.session_index_version_id}` in the input hash.
  const latent_version_id = latentLatest?.latent_version_id ?? "00000000-0000-0000-0000-000000000000";

  const input_hash = sha256("frame:" + material_hash + ":" + latent_version_id);
  const idempotency_key = jobIdempotencyKeyV0("generate_frame", event.session_id, material_hash);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "generate_frame",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    const recs = started.job.output_ref?.recommended_directions ?? [];
    const recSlugs = started.job.output_ref?.recommended_slugs ?? [];
    return {
      frame_version_id: started.job.output_ref?.frame_version_id ?? null,
      skipped: true,
      ok: started.job.status === "success",
      recommended_directions: Array.isArray(recs) ? recs : [],
      recommended_slugs: Array.isArray(recSlugs) ? recSlugs : undefined,
    };
  }

  try {
    const catalog = await fetchDirectionCatalog(supabase);
    const recommended = recommendDirectionsFromLatent({
      latent: (latentLatest?.payload ?? null) as any,
      catalog,
    });

    const allowedSlugs = catalog.map((row) => row.slug);
    const recommendedSlugsFallback = recommended.map((r) => r.slug).filter(Boolean);

    const dreamTextRes = await supabase
      .from("dream_entries")
      .select("content, created_at")
      .eq("session_id", event.session_id)
      .eq("user_id", event.user_id)
      .in("kind", ["raw", "raw_entry"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dreamTextRes.error) throw dreamTextRes.error;

    const dreamText = String(dreamTextRes.data?.content ?? "");

    const { payload, model } = await generateFrameFromLatent({
      dreamText,
      observation: obs.payload,
      sessionIndex: idx.payload,
      latent: latentLatest?.payload ?? null,
      catalog,
      allowedSlugs,
      recommendedSlugsFallback,
      sourceIds: {
        observation_version_id: obs.observation_version_id,
        latent_version_id,
        session_index_version_id: idx.session_index_version_id,
      },
    });

    const recommended_directions = payload.recommended_slugs.map((slug) => {
      const fromRec = recommended.find((r) => r.slug === slug);
      const fromCatalog = catalog.find((row) => row.slug === slug);
      let why =
        latentWhyMap.get(slug) ??
        jobWhyMap.get(slug) ??
        fromRec?.why ??
        fallbackWhy(slug, fromCatalog);

      if (!why || looksMojibake(why)) why = fallbackWhy(slug, fromCatalog);
      why = oneSentence(why, 180);
      return {
        slug,
        title: fromRec?.title ?? fromCatalog?.title ?? slug,
        why,
      };
    });

    payload.meta = {
      source_observation_version_id: obs.observation_version_id,
      source_latent_version_id: latent_version_id,
      source_session_index_version_id: idx.session_index_version_id,
      ...(payload.meta ?? {}),
      writer: "jobGenerateFrame:v0-canonical",
      schema: "frame_v0",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    };

    if (
      payload &&
      typeof payload === "object" &&
      ("framing" in payload || "recommended_directions" in payload)
    ) {
      const msg = "Legacy frame payload detected in canonical writer";
      if (process.env.NODE_ENV !== "production") {
        throw new Error(msg);
      } else {
        console.error(msg, payload);
      }
    }

    payload.recommended_directions = recommended_directions.map((r) => ({
      slug: r.slug,
      why: r.why,
    }));

    const frame = await insertFrameVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      model,
      payload,
    });

    await upsertFrameLatest(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      frame_version_id: frame.id,
    });

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: {
        frame_version_id: frame.id,
        recommended_slugs: payload.recommended_slugs,
        recommended_directions,
        observation_version_id: obs.observation_version_id,
        session_index_version_id: idx.session_index_version_id,
        latent_version_id: latentLatest?.latent_version_id ?? null,
      },
      error: null,
    });

    return {
      frame_version_id: frame.id,
      skipped: false,
      ok: true,
      recommended_directions,
      recommended_slugs: payload.recommended_slugs,
    };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: {
        observation_version_id: obs.observation_version_id,
        session_index_version_id: idx.session_index_version_id,
        latent_version_id: latentLatest?.latent_version_id ?? null,
      },
      error: err?.message ?? "jobGenerateFrame failed",
    });

    return { frame_version_id: null, skipped: false, ok: false, recommended_directions: [] };
  }
}

function buildWhyMapFromLatentCandidates(candidates: any): Map<string, string> {
  if (!Array.isArray(candidates)) return new Map();
  const map = new Map<string, string>();
  for (const c of candidates) {
    const slug = typeof c?.slug === "string" ? c.slug.trim() : "";
    const why = typeof c?.why === "string" ? c.why.trim() : "";
    if (!slug || !why) continue;
    map.set(slug, why);
  }
  return map;
}

function buildWhyMapFromRecommendations(recs: any): Map<string, string> {
  if (!Array.isArray(recs)) return new Map();
  const map = new Map<string, string>();
  for (const r of recs) {
    const slug = typeof r?.slug === "string" ? r.slug.trim() : "";
    const why = typeof r?.why === "string" ? r.why.trim() : "";
    if (!slug || !why) continue;
    map.set(slug, why);
  }
  return map;
}

async function fetchLatestWhyMapFromJobs(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<Map<string, string>> {
  try {
    const res = await supabase
      .from("domain_jobs")
      .select("output_ref,finished_at")
      .eq("user_id", user_id)
      .eq("session_id", session_id)
      .eq("job_type", "generate_frame")
      .eq("status", "success")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (res.error || !res.data) return new Map();
    return buildWhyMapFromRecommendations(res.data.output_ref?.recommended_directions);
  } catch {
    return new Map();
  }
}
