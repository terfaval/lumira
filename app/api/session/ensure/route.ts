// app/api/session/ensure/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { createDomainEvent } from "@/src/db/repositories/eventRepo";
import { insertMaterialSnapshotIfMissing } from "@/src/db/repositories/materialRepo";
import { materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import { jobExtractObservation } from "@/src/orchestration/jobs/jobExtractObservation";
import { ensureAnchorsRanked } from "@/src/orchestration/ensureAnchorsRanked";
import { jobBuildSessionIndexFromObservationJob } from "@/src/orchestration/jobs/jobBuildSessionIndexFromObservation";
import { jobUpdateLatent } from "@/src/orchestration/jobs/jobUpdateLatent";
import { jobBuildDreamMapV0 } from "@/src/orchestration/jobs/jobBuildDreamMapV0";
import { jobGenerateFrame } from "@/src/orchestration/jobs/jobGenerateFrame";
import {
  fetchAnchorLatestWithPayloadAndId,
  fetchFrameLatestWithPayloadAndId,
  fetchLatentLatestWithPayloadAndId,
  fetchObservationLatestV0WithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { fetchDreamMapLatest } from "@/src/db/repositories/dreamMapRepo";

type EnsureBody = {
  session_id: string;
  run?: {
    observe?: boolean;
    anchors?: boolean;
    session_index?: boolean;
    latent?: boolean;
    frame?: boolean;
    dream_map?: boolean;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Nincs jogosultság." },
        { status: 401 }
      );
    }

    const user_id = auth.user.id;

    let body: EnsureBody;
    try {
      body = (await req.json()) as EnsureBody;
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Érvénytelen JSON." },
        { status: 400 }
      );
    }

    const session_id = body.session_id;
    if (!session_id) {
      return NextResponse.json(
        { error: "session_id_required", message: "Hiányzó session_id." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Guest detection
    // -------------------------------------------------------------------------
    let isGuest = false;
    try {
      const { data: flagRow } = await supabase
        .from("user_flags")
        .select("is_guest")
        .eq("user_id", user_id)
        .maybeSingle();
      isGuest = !!flagRow?.is_guest;
    } catch {
      isGuest = false;
    }

    // -------------------------------------------------------------------------
    // Run flags (guest: minimal pipeline)
    // -------------------------------------------------------------------------
    const runObserve = !isGuest && body.run?.observe !== false;
    const runAnchors = !isGuest && body.run?.anchors !== false;
    const runSessionIndex = !isGuest && body.run?.session_index !== false;
    const runLatent = !isGuest && body.run?.latent !== false;
    const runFrame = body.run?.frame !== false;
    const runDreamMap = !isGuest && body.run?.dream_map !== false;

    // -------------------------------------------------------------------------
    // Validate session ownership
    // -------------------------------------------------------------------------
    const sess = await supabase
      .from("dream_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .single();

    if (sess.error) {
      return NextResponse.json(
        { error: "not_found", message: "A munkamenet nem található." },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // Compute material hash (deterministic)
    // -------------------------------------------------------------------------
    const [entriesIdsRes, answersIdsRes, prefsRes] = await Promise.all([
      supabase
        .from("dream_entries")
        .select("id,created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("dream_answers")
        .select("id,created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true }),
      supabase.from("user_prefs").select("updated_at").eq("user_id", user_id).single(),
    ]);

    if (entriesIdsRes.error) {
      return NextResponse.json(
        {
          error: "db_error",
          message: "Adatbázis hiba (dream_entries).",
          detail: entriesIdsRes.error.message,
        },
        { status: 500 }
      );
    }
    if (answersIdsRes.error) {
      return NextResponse.json(
        {
          error: "db_error",
          message: "Adatbázis hiba (dream_answers).",
          detail: answersIdsRes.error.message,
        },
        { status: 500 }
      );
    }

    const entry_ids = (entriesIdsRes.data ?? []).map((r) => r.id);
    const answer_ids = (answersIdsRes.data ?? []).map((r) => r.id);
    const user_prefs_updated_at = prefsRes.error ? null : (prefsRes.data.updated_at as string);

    const material_payload = { session_id, entry_ids, answer_ids, user_prefs_updated_at };
    const material_hash = materialHashFromPayload(material_payload);

    // -------------------------------------------------------------------------
    // Best-effort logging (avoid guest / strict RLS breaking the flow)
    // -------------------------------------------------------------------------
    try {
      await insertMaterialSnapshotIfMissing(supabase, {
        session_id,
        user_id,
        hash: material_hash,
        payload: material_payload,
      });
    } catch (e) {
      console.warn("material snapshot insert skipped", e);
    }

    let eventId: string = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    try {
      const event = await createDomainEvent(supabase, {
        user_id,
        session_id,
        type: "session.ensure_requested",
        payload: { material_hash },
      });
      eventId = event.id;
    } catch (e) {
      console.warn("domain event insert skipped", e);
    }

    // -------------------------------------------------------------------------
    // Outputs
    // -------------------------------------------------------------------------
    let observation_version_id: string | null = null;
    let anchor_version_id: string | null = null;
    let session_index_version_id: string | null = null;
    let latent_version_id: string | null = null;
    let frame_version_id: string | null = null;
    let dream_map_version_id: string | null = null;
    let recommended_directions: Array<{ slug: string; title: string; why: string }> = [];

    // -------------------------------------------------------------------------
    // Observe (guestben kikapcsolva)
    // -------------------------------------------------------------------------
    if (runObserve) {
      const obsRes = await jobExtractObservation({
        supabase,
        event: { id: eventId, user_id, session_id },
        material_hash,
      });
      observation_version_id = obsRes.observation_version_id;
    } else {
      const latest = await fetchObservationLatestV0WithPayloadAndId(supabase, user_id, session_id);
      observation_version_id = latest?.observation_version_id ?? null;
    }

    if (!observation_version_id) {
      const latest = await fetchObservationLatestV0WithPayloadAndId(supabase, user_id, session_id);
      observation_version_id = latest?.observation_version_id ?? null;
    }

    // -------------------------------------------------------------------------
    // Session index (guestben kikapcsolva)
    // -------------------------------------------------------------------------
    if (runSessionIndex) {
      const idxRes = await jobBuildSessionIndexFromObservationJob({
        supabase,
        event: { id: eventId, user_id, session_id },
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

    // -------------------------------------------------------------------------
    // Latent (guestben kikapcsolva)
    // -------------------------------------------------------------------------
    if (runLatent) {
      const latentRes = await jobUpdateLatent({
        supabase,
        event: { id: eventId, user_id, session_id },
        material_hash,
      });
      latent_version_id = latentRes.latent_version_id;
    } else {
      const latest = await fetchLatentLatestWithPayloadAndId(supabase, user_id, session_id);
      latent_version_id = latest?.latent_version_id ?? null;
    }

    if (!latent_version_id) {
      const latest = await fetchLatentLatestWithPayloadAndId(supabase, user_id, session_id);
      latent_version_id = latest?.latent_version_id ?? null;
    }

    // -------------------------------------------------------------------------
    // Anchors (guestben kikapcsolva)
    // -------------------------------------------------------------------------
    if (runAnchors) {
      const ensured = await ensureAnchorsRanked(supabase, { user_id, session_id });
      anchor_version_id = ensured.anchor_version_id;
    } else {
      const latest = await fetchAnchorLatestWithPayloadAndId(supabase, user_id, session_id);
      anchor_version_id = latest?.anchor_version_id ?? null;
    }

    if (!anchor_version_id) {
      const latest = await fetchAnchorLatestWithPayloadAndId(supabase, user_id, session_id);
      anchor_version_id = latest?.anchor_version_id ?? null;
    }

    // -------------------------------------------------------------------------
    // Dream map (anchors utĂˇn, frame elĹ‘tt)
    // -------------------------------------------------------------------------
    if (runDreamMap) {
      const dreamMapRes = await jobBuildDreamMapV0({
        supabase,
        event: { id: eventId, user_id, session_id },
        material_hash,
      });
      dream_map_version_id = dreamMapRes.dream_map_version_id;
    } else {
      const latest = await fetchDreamMapLatest(supabase, { session_id, user_id });
      dream_map_version_id = latest?.dream_map_version_id ?? null;
    }

    if (!dream_map_version_id) {
      const latest = await fetchDreamMapLatest(supabase, { session_id, user_id });
      dream_map_version_id = latest?.dream_map_version_id ?? null;
    }

    // -------------------------------------------------------------------------
    // Frame (guestben is fut, latent nélkül is fallbackolhat)
    // -------------------------------------------------------------------------
    if (runFrame) {
      const frameRes = await jobGenerateFrame({
        supabase,
        event: { id: eventId, user_id, session_id },
        material_hash,
        allowFallbackWithoutLatent: isGuest ? true : false,
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
      is_guest: isGuest,
      observation_version_id,
      anchor_version_id,
      session_index_version_id,
      latent_version_id,
      dream_map_version_id,
      frame_version_id,
      recommended_directions,
    });
  } catch (e: any) {
    console.error("session/ensure failed", e);
    return NextResponse.json(
      { error: "internal", message: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
