// app/api/session/ensure/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { createDomainEvent } from "@/src/db/repositories/eventRepo";
import { insertMaterialSnapshotIfMissing } from "@/src/db/repositories/materialRepo";
import { materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import { jobExtractObservation } from "@/src/orchestration/jobs/jobExtractObservation";
import { jobExtractAnchors } from "@/src/orchestration/jobs/jobExtractAnchors";
import { jobBuildSessionIndexFromObservationJob } from "@/src/orchestration/jobs/jobBuildSessionIndexFromObservation";
import { jobUpdateLatent } from "@/src/orchestration/jobs/jobUpdateLatent";
import { jobGenerateFrame } from "@/src/orchestration/jobs/jobGenerateFrame";
import {
  fetchAnchorLatestWithPayloadAndId,
  fetchFrameLatestWithPayloadAndId,
  fetchLatentLatestWithPayloadAndId,
  fetchObservationLatestWithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";

type EnsureBody = {
  session_id: string;
  run?: {
    observe?: boolean;
    anchors?: boolean;
    session_index?: boolean;
    latent?: boolean;
    frame?: boolean;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseServerAuthed();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user_id = auth.user.id;

  let body: EnsureBody;
  try {
    body = (await req.json()) as EnsureBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const session_id = body.session_id;
  if (!session_id) return NextResponse.json({ error: "session_id_required" }, { status: 400 });

  const runObserve = body.run?.observe !== false;
  const runAnchors = body.run?.anchors !== false;
  const runSessionIndex = body.run?.session_index !== false;
  const runLatent = body.run?.latent !== false;
  const runFrame = body.run?.frame !== false;

  const sess = await supabase.from("dream_sessions").select("id").eq("id", session_id).eq("user_id", user_id).single();
  if (sess.error) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [entriesIdsRes, answersIdsRes, prefsRes] = await Promise.all([
    supabase.from("dream_entries").select("id,created_at").eq("session_id", session_id).order("created_at", { ascending: true }),
    supabase.from("dream_answers").select("id,created_at").eq("session_id", session_id).order("created_at", { ascending: true }),
    supabase.from("user_prefs").select("updated_at").eq("user_id", user_id).single(),
  ]);

  if (entriesIdsRes.error) return NextResponse.json({ error: entriesIdsRes.error.message }, { status: 500 });
  if (answersIdsRes.error) return NextResponse.json({ error: answersIdsRes.error.message }, { status: 500 });

  const entry_ids = (entriesIdsRes.data ?? []).map((r) => r.id);
  const answer_ids = (answersIdsRes.data ?? []).map((r) => r.id);
  const user_prefs_updated_at = prefsRes.error ? null : (prefsRes.data.updated_at as string);

  const material_payload = { session_id, entry_ids, answer_ids, user_prefs_updated_at };
  const material_hash = materialHashFromPayload(material_payload);

  await insertMaterialSnapshotIfMissing(supabase, {
    session_id,
    user_id,
    hash: material_hash,
    payload: material_payload,
  });

  const event = await createDomainEvent(supabase, {
    user_id,
    session_id,
    type: "session.ensure_requested",
    payload: { material_hash },
  });

  let observation_version_id: string | null = null;
  let anchor_version_id: string | null = null;
  let session_index_version_id: string | null = null;
  let latent_version_id: string | null = null;
  let frame_version_id: string | null = null;
  let recommended_directions: Array<{ slug: string; title: string; why: string }> = [];

  if (runObserve) {
    const obsRes = await jobExtractObservation({ supabase, event: { id: event.id, user_id, session_id }, material_hash });
    observation_version_id = obsRes.observation_version_id;
  } else {
    const latest = await fetchObservationLatestWithPayloadAndId(supabase, user_id, session_id);
    observation_version_id = latest?.observation_version_id ?? null;
  }

  if (!observation_version_id) {
    const latest = await fetchObservationLatestWithPayloadAndId(supabase, user_id, session_id);
    observation_version_id = latest?.observation_version_id ?? null;
  }

  if (runAnchors) {
    const anchorRes = await jobExtractAnchors({ supabase, event: { id: event.id, user_id, session_id }, material_hash });
    anchor_version_id = anchorRes.anchor_version_id;
  } else {
    const latest = await fetchAnchorLatestWithPayloadAndId(supabase, user_id, session_id);
    anchor_version_id = latest?.anchor_version_id ?? null;
  }

  if (!anchor_version_id) {
    const latest = await fetchAnchorLatestWithPayloadAndId(supabase, user_id, session_id);
    anchor_version_id = latest?.anchor_version_id ?? null;
  }

  if (runSessionIndex) {
    const idxRes = await jobBuildSessionIndexFromObservationJob({
      supabase,
      event: { id: event.id, user_id, session_id },
      material_hash,
    });
    session_index_version_id = idxRes.session_index_version_id;
  } else {
    const latest = await fetchSessionIndexLatestWithPayloadAndId(supabase, user_id, session_id);
    session_index_version_id = latest?.session_index_version_id ?? null;
  }

  if (!session_index_version_id) {
    const latest = await fetchSessionIndexLatestWithPayloadAndId(supabase, user_id, session_id);
    session_index_version_id = latest?.session_index_version_id ?? null;
  }

  if (runLatent) {
    const latentRes = await jobUpdateLatent({ supabase, event: { id: event.id, user_id, session_id }, material_hash });
    latent_version_id = latentRes.latent_version_id;
  } else {
    const latest = await fetchLatentLatestWithPayloadAndId(supabase, user_id, session_id);
    latent_version_id = latest?.latent_version_id ?? null;
  }

  if (!latent_version_id) {
    const latest = await fetchLatentLatestWithPayloadAndId(supabase, user_id, session_id);
    latent_version_id = latest?.latent_version_id ?? null;
  }

  if (runFrame) {
    const frameRes = await jobGenerateFrame({
      supabase,
      event: { id: event.id, user_id, session_id },
      material_hash,
      allowFallbackWithoutLatent: false,
    });
    frame_version_id = frameRes.frame_version_id;
    recommended_directions = frameRes.recommended_directions ?? [];
  } else {
    const latest = await fetchFrameLatestWithPayloadAndId(supabase, user_id, session_id);
    frame_version_id = latest?.frame_version_id ?? null;
    if (Array.isArray(latest?.payload?.recommended_directions)) {
      recommended_directions = latest?.payload?.recommended_directions;
    } else if (Array.isArray(latest?.payload?.recommended_slugs)) {
      recommended_directions = latest?.payload?.recommended_slugs.map((slug: string) => ({
        slug,
        title: slug,
        why: "",
      }));
    } else {
      recommended_directions = [];
    }
  }

  if (!frame_version_id) {
    const latest = await fetchFrameLatestWithPayloadAndId(supabase, user_id, session_id);
    frame_version_id = latest?.frame_version_id ?? null;
    if (recommended_directions.length === 0) {
      if (Array.isArray(latest?.payload?.recommended_directions)) {
        recommended_directions = latest?.payload?.recommended_directions;
      } else if (Array.isArray(latest?.payload?.recommended_slugs)) {
        recommended_directions = latest?.payload?.recommended_slugs.map((slug: string) => ({
          slug,
          title: slug,
          why: "",
        }));
      }
    }
  }

  return NextResponse.json({
    status: "ok",
    session_id,
    material_hash,
    observation_version_id,
    anchor_version_id,
    session_index_version_id,
    latent_version_id,
    frame_version_id,
    recommended_directions,
  });
}
