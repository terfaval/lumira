import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerBody = {
  session_id?: string;
  direction_slug?: string;
  work_block_id?: string;
  answer_text?: string;
  metadata?: unknown;
};

export async function POST(req: Request) {
  const supabase = await supabaseServerAuthed(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user_id = auth.user.id;

  let body: AnswerBody;
  try {
    body = (await req.json()) as AnswerBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const session_id = typeof body.session_id === "string" ? body.session_id : "";
  const work_block_id = typeof body.work_block_id === "string" ? body.work_block_id : "";
  const answer_text = typeof body.answer_text === "string" ? body.answer_text.trim() : "";

  if (!session_id) return NextResponse.json({ error: "session_id_required" }, { status: 400 });
  if (!work_block_id) return NextResponse.json({ error: "work_block_id_required" }, { status: 400 });
  if (!answer_text) return NextResponse.json({ error: "answer_text_required" }, { status: 400 });

  const sess = await supabase
    .from("dream_sessions")
    .select("id")
    .eq("id", session_id)
    .eq("user_id", user_id)
    .single();
  if (sess.error) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const workBlock = await supabase
    .from("work_versions")
    .select("id")
    .eq("id", work_block_id)
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .single();
  if (workBlock.error) return NextResponse.json({ error: "work_block_not_found" }, { status: 404 });

  const existing = await supabase
    .from("dream_answers")
    .select("id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .eq("work_id", work_block_id)
    .eq("content", answer_text)
    .limit(1)
    .maybeSingle();

  if (existing.data) {
    return NextResponse.json({ ok: true, answer_id: existing.data.id, reused: true });
  }

  const inserted = await supabase
    .from("dream_answers")
    .insert({
      session_id,
      user_id,
      work_id: work_block_id,
      content: answer_text,
    })
    .select("id")
    .single();

  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, answer_id: inserted.data.id });
}
