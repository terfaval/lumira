import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeJsonBody(req: Request): Promise<any | null> {
  return req.json().catch(() => null);
}

export async function POST(req: Request, context: { params: { sessionId: string } }) {
  try {
    const sessionId = String(context?.params?.sessionId ?? "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }

    const body = await safeJsonBody(req);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const suggestion_key = String(body.suggestion_key ?? "").trim();
    if (!suggestion_key) {
      return NextResponse.json({ error: "suggestion_key_required" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    const res = await supabase
      .from("dream_session_rejected_suggestions")
      .upsert(
        {
          user_id,
          session_id: sessionId,
          suggestion_key,
        },
        { onConflict: "session_id,suggestion_key" }
      )
      .select("suggestion_key")
      .maybeSingle();

    if (res.error) {
      return NextResponse.json(
        { error: "db_error", message: "Rejection mentés hiba.", detail: res.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, suggestion_key: res.data?.suggestion_key ?? suggestion_key });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
