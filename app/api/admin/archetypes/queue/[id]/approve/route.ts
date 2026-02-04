import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { supabaseServerService } from "@/src/lib/supabase/serverService";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { setArchetypeQueueStatus } from "@/src/db/repositories/archetypeQueueRepo";
import { upsertArchetypeTerm } from "@/src/db/repositories/archetypeRepo";
import { normalizeBaseKey } from "@/src/domain/archetypes/normalizeBaseKey";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServerAuthed(req);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = isGlossaryAdmin(auth.user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const svc = supabaseServerService();
  const { id } = await ctx.params;

  const q = await svc.from("archetype_term_queue").select("*").eq("id", id).single();
  if (q.error || !q.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const row = q.data as any;
  const domain = String(row.domain);
  const user_id = String(row.user_id);
  const canonical_key = normalizeBaseKey(row.suggested_canonical_key || row.base_key || row.canonical_key);
  const canonical_label = String(row.canonical_label ?? canonical_key).trim() || canonical_key;

  const base_key = normalizeBaseKey(row.base_key || row.canonical_key || canonical_key);
  const aliases = Array.isArray(row.aliases) ? row.aliases : [];
  const nextAliases = Array.from(new Set([base_key, ...aliases].filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

  const saved = await upsertArchetypeTerm(svc, {
    user_id,
    domain: domain as any,
    canonical_key,
    canonical_label,
    alias_keys: nextAliases,
    status: "verified",
    provenance: "admin",
  });

  if (!saved) return NextResponse.json({ error: "term_upsert_failed" }, { status: 500 });

  await setArchetypeQueueStatus(svc, { id, status: "approved" });
  return NextResponse.json({ ok: true, archetype_term_id: saved.id });
}
