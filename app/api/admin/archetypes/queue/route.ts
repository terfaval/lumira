import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/db/supabaseServerAuthed";
import { supabaseServerService } from "@/src/db/supabaseServerService";
import { isGlossaryAdmin } from "@/src/lib/auth/isGlossaryAdmin";
import { listArchetypeQueue } from "@/src/db/repositories/archetypeQueueRepo";

export async function GET(req: Request) {
  const authed = await supabaseServerAuthed();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = await isGlossaryAdmin(authed.supabase, authed.user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "open";
  const domain = url.searchParams.get("domain") ?? undefined;
  const user_id = url.searchParams.get("user_id") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const svc = await supabaseServerService();
  const out = await listArchetypeQueue(svc, { status: status as any, domain, user_id, q, limit, offset });
  return NextResponse.json(out);
}
