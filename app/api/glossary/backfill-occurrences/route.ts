// /app/api/glossary/backfill-occurrences/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { backfillGlossaryOccurrencesForTerm } from "@/src/domain/glossary/backfillGlossaryOccurrences";

type RequestBody = {
  term_id?: string;
  max_sessions?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const termId = body.term_id;
    if (!termId) {
      return NextResponse.json({ error: "missing_term_id" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = authData.user.id;
    const { data: termRow, error: termErr } = await supabase
      .from("glossary_terms")
      .select("id, canonical, canonical_key")
      .eq("id", termId)
      .eq("user_id", userId)
      .maybeSingle();

    if (termErr) {
      return NextResponse.json({ error: termErr.message }, { status: 500 });
    }
    if (!termRow) {
      return NextResponse.json({ error: "term_not_found" }, { status: 404 });
    }

    const canonicalKey = termRow.canonical_key ?? anchorKey(termRow.canonical ?? "");
    if (!canonicalKey) {
      return NextResponse.json({ error: "missing_canonical_key" }, { status: 400 });
    }

    const result = await backfillGlossaryOccurrencesForTerm({
      supabase,
      userId,
      termId: termRow.id,
      canonicalKey,
      maxSessions: typeof body.max_sessions === "number" ? body.max_sessions : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
