// app/api/session/submit/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { createDomainEvent } from "@/src/db/repositories/eventRepo";
import { insertMaterialSnapshotIfMissing } from "@/src/db/repositories/materialRepo";
import { canonicalJsonString, materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";
import { jobExtractObservation } from "@/src/orchestration/jobs/jobExtractObservation";
import { jobBuildSessionIndexFromObservationJob } from "@/src/orchestration/jobs/jobBuildSessionIndexFromObservation";

type SubmitBody = {
  content: string;
  kind?: "raw" | "dictation" | "edit" | "note";
  title?: string;
  run?: { observe?: boolean; index?: boolean };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseServerAuthed();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user_id = auth.user.id;

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (content.length < 1) return NextResponse.json({ error: "content_required" }, { status: 400 });

  const kind = body.kind ?? "raw";
  const title = body.title?.trim() || null;

  const runObserve = body.run?.observe !== false; // default true if run provided? ticket says run.observe true/false; safest: default true
  const runIndex = body.run?.index !== false;

  // 1) Create session (status=submitted)
  const sessRes = await supabase
    .from("dream_sessions")
    .insert({ user_id, status: "submitted", title })
    .select("id")
    .single();

  if (sessRes.error) return NextResponse.json({ error: sessRes.error.message }, { status: 500 });
  const session_id = sessRes.data.id as string;

  // 2) Insert entry
  const entryRes = await supabase
    .from("dream_entries")
    .insert({ session_id, user_id, kind, content })
    .select("id")
    .single();

  if (entryRes.error) return NextResponse.json({ error: entryRes.error.message }, { status: 500 });
  const entry_id = entryRes.data.id as string;

  // 3) Build material snapshot (entries + answers + prefs updated_at)
  const [entriesIdsRes, answersIdsRes, prefsRes] = await Promise.all([
    supabase.from("dream_entries").select("id,created_at").eq("session_id", session_id).order("created_at", { ascending: true }),
    supabase.from("dream_answers").select("id,created_at").eq("session_id", session_id).order("created_at", { ascending: true }),
    supabase.from("user_prefs").select("updated_at").eq("user_id", user_id).single(),
  ]);

  if (entriesIdsRes.error) return NextResponse.json({ error: entriesIdsRes.error.message }, { status: 500 });
  if (answersIdsRes.error) return NextResponse.json({ error: answersIdsRes.error.message }, { status: 500 });

  const entry_ids = (entriesIdsRes.data ?? []).map((r) => r.id);
  const answer_ids = (answersIdsRes.data ?? []).map((r) => r.id);

  const user_prefs_updated_at =
    prefsRes.error ? null : (prefsRes.data.updated_at as string);

  const material_payload = {
    session_id,
    entry_ids,
    answer_ids,
    user_prefs_updated_at,
  };

  // Hash is computed from canonical JSON
  const material_hash = materialHashFromPayload(material_payload);

  await insertMaterialSnapshotIfMissing(supabase, {
    session_id,
    user_id,
    hash: material_hash,
    payload: JSON.parse(canonicalJsonString(material_payload)),
  });

  // 4) Create domain event session.submitted
  const event = await createDomainEvent(supabase, {
    user_id,
    session_id,
    type: "session.submitted",
    payload: { entry_id, material_hash },
  });

  // 5) Run jobs (sequential for determinism)
  let observation_version_id: string | null = null;
  let session_index_version_id: string | null = null;

  if (runObserve) {
    const obs = await jobExtractObservation({
      supabase,
      event: { id: event.id, user_id, session_id },
      material_hash,
    });
    observation_version_id = obs.observation_version_id;
  }

  if (runIndex) {
    const idx = await jobBuildSessionIndexFromObservationJob({
      supabase,
      event: { id: event.id, user_id, session_id },
      material_hash,
    });
    session_index_version_id = idx.session_index_version_id;
  }

  return NextResponse.json({
    status: "ok",
    session_id,
    entry_id,
    observation_version_id,
    session_index_version_id,
  });
}
