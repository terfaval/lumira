import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PersistBody = {
  session_id?: string;
  payload?: unknown;
  client_request_id?: string;
  work_block_id?: string;
  answer_idx?: number;
  metadata?: unknown;
};

function normalizeIdempotencyKey(params: {
  sessionId: string;
  clientRequestId?: string;
  workBlockId?: string;
  answerIdx?: number;
}) {
  if (params.clientRequestId) {
    return `client:${params.sessionId}:${params.clientRequestId}`;
  }
  if (params.workBlockId && Number.isFinite(params.answerIdx)) {
    return `answer:${params.sessionId}:${params.workBlockId}:${params.answerIdx}`;
  }
  return "";
}

async function upsertWorkLatest(supabase: any, session_id: string, user_id: string, work_version_id: string) {
  const { error } = await supabase
    .from("work_latest")
    .upsert(
      {
        session_id,
        user_id,
        work_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

  if (error) throw error;
}

export async function POST(req: Request) {
  const supabase = await supabaseServerAuthed(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user_id = auth.user.id;

  let body: PersistBody;
  try {
    body = (await req.json()) as PersistBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const session_id = typeof body.session_id === "string" ? body.session_id : "";
  if (!session_id) return NextResponse.json({ error: "session_id_required" }, { status: 400 });

  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "payload_required" }, { status: 400 });
  }

  const client_request_id =
    typeof body.client_request_id === "string" ? body.client_request_id.trim() : "";
  const work_block_id = typeof body.work_block_id === "string" ? body.work_block_id.trim() : "";
  const answer_idx =
    typeof body.answer_idx === "number" && Number.isFinite(body.answer_idx) ? body.answer_idx : undefined;

  const idempotencyKey = normalizeIdempotencyKey({
    sessionId: session_id,
    clientRequestId: client_request_id || undefined,
    workBlockId: work_block_id || undefined,
    answerIdx: answer_idx,
  });

  if (!idempotencyKey) {
    return NextResponse.json({ error: "idempotency_key_required" }, { status: 400 });
  }

  const sess = await supabase
    .from("dream_sessions")
    .select("id")
    .eq("id", session_id)
    .eq("user_id", user_id)
    .single();
  if (sess.error) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const input_hash = sha256(idempotencyKey);

  const existing = await supabase
    .from("work_versions")
    .select("id, session_id, user_id, payload, created_at")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .eq("input_hash", input_hash)
    .limit(1)
    .maybeSingle();

  if (existing.data) {
    try {
      await upsertWorkLatest(supabase, session_id, user_id, existing.data.id);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message ?? "work_latest_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, work_version: existing.data, reused: true });
  }

  const lastVersion = await supabase
    .from("work_versions")
    .select("version")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .order("version", { ascending: false })
    .limit(1);

  if (lastVersion.error)
    return NextResponse.json({ error: lastVersion.error.message }, { status: 500 });

  const nextVersion = (lastVersion.data?.[0]?.version ?? 0) + 1;

  const inserted = await supabase
    .from("work_versions")
    .insert({
      session_id,
      user_id,
      version: nextVersion,
      input_hash,
      model: null,
      payload: body.payload,
    })
    .select("id, session_id, user_id, payload, created_at")
    .single();

  if (inserted.error) {
    const code = (inserted.error as any)?.code;
    if (code !== "23505")
      return NextResponse.json({ error: inserted.error.message }, { status: 500 });

    const again = await supabase
      .from("work_versions")
      .select("id, session_id, user_id, payload, created_at")
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .eq("input_hash", input_hash)
      .limit(1)
      .maybeSingle();

    if (again.error || !again.data) {
      return NextResponse.json({ error: "work_version_conflict" }, { status: 500 });
    }

    try {
      await upsertWorkLatest(supabase, session_id, user_id, again.data.id);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message ?? "work_latest_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, work_version: again.data, reused: true });
  }

  try {
    await upsertWorkLatest(supabase, session_id, user_id, inserted.data.id);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "work_latest_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, work_version: inserted.data });
}
