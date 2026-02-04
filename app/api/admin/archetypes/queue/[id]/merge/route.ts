import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { supabaseServerService } from "@/src/lib/supabase/serverService";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { setArchetypeQueueStatus } from "@/src/db/repositories/archetypeQueueRepo";
import { mergeAliasIntoArchetypeTerm } from "@/src/db/repositories/archetypeRepo";
import { normalizeBaseKey } from "@/src/domain/archetypes/normalizeBaseKey";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServerAuthed(req);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = isGlossaryAdmin(auth.user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const target_canonical_key = normalizeBaseKey(body?.target_canonical_key ?? "");
  if (!target_canonical_key) return NextResponse.json({ error: "missing_target" }, { status: 400 });

  const svc = supabaseServerService();
  const { id } = await ctx.params;

  const q = await svc.from("archetype_term_queue").select("*").eq("id", id).single();
  if (q.error || !q.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const row = q.data as any;
  const domain = String(row.domain);
  const user_id = String(row.user_id);
  const base_key = normalizeBaseKey(row.base_key || row.canonical_key || "");
  if (!base_key) return NextResponse.json({ error: "missing_base_key" }, { status: 400 });

  const merged = await mergeAliasIntoArchetypeTerm(svc, {
    user_id,
    domain: domain as any,
    canonical_key: target_canonical_key,
    alias_key: base_key,
  });

  if (!merged) return NextResponse.json({ error: "merge_failed" }, { status: 500 });

  await setArchetypeQueueStatus(svc, { id, status: "merged" });
  return NextResponse.json({ ok: true });
}
