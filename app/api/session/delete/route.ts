// app/api/session/delete/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

type DeleteBody = {
  session_id?: string;
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

    let body: DeleteBody;
    try {
      body = (await req.json()) as DeleteBody;
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Érvénytelen JSON." },
        { status: 400 }
      );
    }

    const session_id = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!session_id) {
      return NextResponse.json(
        { error: "session_id_required", message: "Hiányzó session_id." },
        { status: 400 }
      );
    }

    const user_id = auth.user.id;

    const { data: sessionRow, error: sessionErr } = await supabase
      .from("dream_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (sessionErr || !sessionRow) {
      return NextResponse.json(
        { error: "not_found", message: "A munkamenet nem található." },
        { status: 404 }
      );
    }

    const { error: delErr } = await supabase
      .from("dream_sessions")
      .delete()
      .eq("id", session_id)
      .eq("user_id", user_id);

    if (delErr) {
      return NextResponse.json(
        { error: "db_error", message: "Nem sikerült törölni a munkamenetet.", detail: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("session delete failed", e);
    return NextResponse.json(
      { error: "internal", message: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
