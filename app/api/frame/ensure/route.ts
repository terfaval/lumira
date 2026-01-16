// app/api/frame/ensure/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { createDomainEvent } from "@/src/db/repositories/eventRepo";
import { insertMaterialSnapshotIfMissing } from "@/src/db/repositories/materialRepo";
import { canonicalJsonString, materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import { jobUpdateLatent } from "@/src/orchestration/jobs/jobUpdateLatent";
import { jobGenerateFrame } from "@/src/orchestration/jobs/jobGenerateFrame";
import { fetchLatentLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";

type EnsureBody = {
  session_id: string;
  run?: { latent?: boolean; frame?: boolean };
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

  const runLatent = body.run?.latent !== false; // default true
  const runFrame = body.run?.frame !== false;   // default true

  // Ensure user owns session (RLS will also enforce on selects, but fail fast)
  const sess = await supabase.from("dream_sessions").select("id").eq("id", session_id).eq("user_id", user_id).single();
  if (sess.error) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Material snapshot (same as Ticket A)
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

  // Hash továbbra is canonical JSON-ből
  const material_hash = materialHashFromPayload(material_payload);

  // DB-be megy a natív objektum
  await insertMaterialSnapshotIfMissing(supabase, {
    session_id,
    user_id,
    hash: material_hash,
    payload: material_payload,
  });


  const event = await createDomainEvent(supabase, {
    user_id,
    session_id,
    type: "frame.ensure_requested",
    payload: { material_hash },
  });

  let latent_version_id: string | null = null;
  let frame_version_id: string | null = null;
  let recommended_directions: Array<{ slug: string; title: string; why: string }> = [];

  if (runLatent) {
    const latentRes = await jobUpdateLatent({ supabase, event: { id: event.id, user_id, session_id }, material_hash });
    latent_version_id = latentRes.latent_version_id;
  } else {
    const latentLatest = await fetchLatentLatestWithPayloadAndId(supabase, user_id, session_id);
    latent_version_id = latentLatest?.latent_version_id ?? null;
  }

  if (runFrame) {
    const frameRes = await jobGenerateFrame({
      supabase,
      event: { id: event.id, user_id, session_id },
      material_hash,
      allowFallbackWithoutLatent: false, // v0 default per spec: don't run if latent failed (unless you want fallback)
    });
    frame_version_id = frameRes.frame_version_id;
    recommended_directions = frameRes.recommended_directions ?? [];
  }

  return NextResponse.json({
    status: "ok",
    session_id,
    material_hash,
    latent_version_id,
    frame_version_id,
    recommended_directions,
  });
}
