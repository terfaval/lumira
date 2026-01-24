// /app/api/glossary/backfill-occurrences/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import {
  backfillGlossaryOccurrencesForTerm,
  DEFAULT_MAX_SESSIONS,
  MAX_SESSIONS_HARD_LIMIT,
} from "@/src/domain/glossary/backfillGlossaryOccurrences";

type RequestBody = {
  term_id?: string;
  max_sessions?: number;
  async?: boolean;
};

// NOTE: Async mode is best-effort on serverless; the runtime can freeze after response.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const termId = body.term_id;
    if (!termId) {
      return NextResponse.json({ error: "missing_term_id" }, { status: 400 });
    }

    if (body.max_sessions !== undefined) {
      if (typeof body.max_sessions !== "number" || !Number.isFinite(body.max_sessions)) {
        return NextResponse.json({ error: "invalid_max_sessions" }, { status: 400 });
      }
      if (body.max_sessions <= 0) {
        return NextResponse.json({ error: "invalid_max_sessions" }, { status: 400 });
      }
    }

    if (body.async !== undefined && typeof body.async !== "boolean") {
      return NextResponse.json({ error: "invalid_async_flag" }, { status: 400 });
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

    const requested = body.max_sessions ?? DEFAULT_MAX_SESSIONS;
    const maxSessions = Math.min(Math.max(1, Math.floor(requested)), MAX_SESSIONS_HARD_LIMIT);

    const args = {
      supabase,
      userId,
      termId: termRow.id,
      canonicalKey,
      maxSessions,
      logProgress: true,
    };

    if (body.async) {
      void backfillGlossaryOccurrencesForTerm(args);
      return NextResponse.json({ ok: true, queued: true }, { status: 202 });
    }

    const result = await backfillGlossaryOccurrencesForTerm(args);
    return NextResponse.json({
      ok: true,
      queued: false,
      scanned_sessions: result.scanned,
      matched_sessions: result.matched,
      upserted_rows: result.upserted,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
