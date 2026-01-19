import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DirectionBody = {
  session_id?: string;
  slug?: string;
  source?: string;
};

export async function POST(req: Request) {
  const supabase = await supabaseServerAuthed(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user_id = auth.user.id;

  let body: DirectionBody;
  try {
    body = (await req.json()) as DirectionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const session_id = typeof body.session_id === "string" ? body.session_id : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const source = typeof body.source === "string" ? body.source.trim() : "direction_modal";

  if (!session_id) return NextResponse.json({ error: "session_id_required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "slug_required" }, { status: 400 });

  const sess = await supabase
    .from("dream_sessions")
    .select("id")
    .eq("id", session_id)
    .eq("user_id", user_id)
    .single();
  if (sess.error) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await supabase
    .from("session_directions")
    .select("id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .eq("direction_slug", slug)
    .maybeSingle();

  let already_selected = Boolean(existing.data);

  if (!already_selected) {
    const inserted = await supabase.from("session_directions").insert({
      session_id,
      user_id,
      direction_slug: slug,
      source,
    });

    if (inserted.error) {
      const code = (inserted.error as any)?.code;
      if (code !== "23505")
        return NextResponse.json({ error: inserted.error.message }, { status: 500 });
      already_selected = true;
    }
  }

  const next_url = `/session/${session_id}/work?direction=${encodeURIComponent(slug)}`;
  return NextResponse.json({ ok: true, next_url, already_selected });
}
