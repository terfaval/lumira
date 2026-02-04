import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { supabaseServerService } from "@/src/lib/supabase/serverService";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { setArchetypeQueueStatus } from "@/src/db/repositories/archetypeQueueRepo";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = await supabaseServerAuthed(req);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = isGlossaryAdmin(auth.user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note : null;

  const svc = supabaseServerService();
  const id = ctx.params.id;

  const updated = await setArchetypeQueueStatus(svc, { id, status: "rejected", note });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
