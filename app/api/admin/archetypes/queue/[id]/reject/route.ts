import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/db/supabaseServerAuthed";
import { supabaseServerService } from "@/src/db/supabaseServerService";
import { isGlossaryAdmin } from "@/src/lib/auth/isGlossaryAdmin";
import { setArchetypeQueueStatus } from "@/src/db/repositories/archetypeQueueRepo";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const authed = await supabaseServerAuthed();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = await isGlossaryAdmin(authed.supabase, authed.user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note : null;

  const svc = await supabaseServerService();
  const id = ctx.params.id;

  const updated = await setArchetypeQueueStatus(svc, { id, status: "rejected", note });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
