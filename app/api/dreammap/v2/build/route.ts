// app/api/dreammap/v2/build/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { fetchArchetypeTerms } from "@/src/db/repositories/archetypeRepo";
import { insertDreamMapV2VersionIfMissing, upsertDreamMapV2Latest } from "@/src/db/repositories/dreamMapV2Repo";
import { buildDreamMapV2 } from "@/src/domain/dreammap/buildDreamMapV2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingColumnError(error: unknown, column: string): boolean {
  const msg = String((error as any)?.message ?? "").toLowerCase();
  return msg.includes("column") && msg.includes(column.toLowerCase()) && msg.includes("does not exist");
}

async function fetchGlossaryOccurrences(supabase: Awaited<ReturnType<typeof supabaseServerAuthed>>, user_id: string) {
  let res = await supabase
    .from("glossary_occurrences")
    .select("term_id,session_id,count")
    .eq("user_id", user_id);

  if (res.error && isMissingColumnError(res.error, "count")) {
    res = await supabase
      .from("glossary_occurrences")
      .select("term_id,session_id")
      .eq("user_id", user_id);
  }

  if (res.error) throw res.error;

  return (res.data ?? []).map((row: any) => ({
    term_id: typeof row?.term_id === "string" ? row.term_id : "",
    session_id: typeof row?.session_id === "string" ? row.session_id : "",
    count: typeof row?.count === "number" ? row.count : null,
  })).filter((row: any) => row.term_id && row.session_id);
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    let isGuest = false;
    try {
      const { data: flags } = await supabase
        .from("user_flags")
        .select("is_guest")
        .eq("user_id", user_id)
        .maybeSingle();
      isGuest = !!flags?.is_guest;
    } catch {
      isGuest = false;
    }

    if (isGuest) {
      return NextResponse.json({ error: "guest_forbidden" }, { status: 403 });
    }

    const [termsRes, highlightsRes, occurrences, archetypeRows] = await Promise.all([
      supabase
        .from("glossary_terms")
        .select("id,canonical,canonical_key,category,archetype_term_id")
        .eq("user_id", user_id),
      supabase
        .from("dream_entry_highlights")
        .select("id,session_id,entry_id,start_offset,end_offset,text,category,note,glossary_term_id")
        .eq("user_id", user_id)
        .not("glossary_term_id", "is", null),
      fetchGlossaryOccurrences(supabase, user_id),
      fetchArchetypeTerms(supabase, { user_id, statuses: ["verified", "proposed"] }),
    ]);

    if (termsRes.error) {
      return NextResponse.json({ error: termsRes.error.message }, { status: 500 });
    }
    if (highlightsRes.error) {
      return NextResponse.json({ error: highlightsRes.error.message }, { status: 500 });
    }

    const payload = buildDreamMapV2({
      user_id,
      glossary_terms: (termsRes.data ?? []).map((row: any) => ({
        id: String(row?.id ?? ""),
        canonical: typeof row?.canonical === "string" ? row.canonical : null,
        canonical_key: typeof row?.canonical_key === "string" ? row.canonical_key : null,
        category: typeof row?.category === "string" ? row.category : null,
        archetype_term_id: typeof row?.archetype_term_id === "string" ? row.archetype_term_id : null,
      })).filter((row: any) => row.id),
      entry_highlights: (highlightsRes.data ?? []).map((row: any) => ({
        id: String(row?.id ?? ""),
        session_id: String(row?.session_id ?? ""),
        entry_id: String(row?.entry_id ?? ""),
        start_offset: typeof row?.start_offset === "number" ? row.start_offset : 0,
        end_offset: typeof row?.end_offset === "number" ? row.end_offset : 0,
        text: typeof row?.text === "string" ? row.text : "",
        category: typeof row?.category === "string" ? row.category : null,
        note: typeof row?.note === "string" ? row.note : null,
        glossary_term_id: typeof row?.glossary_term_id === "string" ? row.glossary_term_id : null,
      })).filter((row: any) => row.id && row.session_id && row.entry_id && row.end_offset > row.start_offset),
      glossary_occurrences: occurrences,
      archetype_terms: (archetypeRows ?? [])
        .map((row) => ({ id: row.id, canonical_key: row.canonical_key }))
        .filter((row) => row.id && row.canonical_key),
    });

    const saved = await insertDreamMapV2VersionIfMissing(supabase, {
      user_id,
      input_hash: payload.meta.input_hash,
      schema_version: payload.schema_version,
      algo_version: payload.algo_version,
      payload,
    });

    await upsertDreamMapV2Latest(supabase, {
      user_id,
      dream_map_v2_version_id: saved.id,
    });

    return NextResponse.json({
      status: "ok",
      dream_map_v2_version_id: saved.id,
      inserted: saved.inserted,
      payload,
    });
  } catch (error: any) {
    console.error("api/dreammap/v2/build failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: error?.message ? String(error.message) : "Unknown error" },
      { status: 500 }
    );
  }
}
