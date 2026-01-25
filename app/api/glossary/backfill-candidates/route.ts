export const runtime = "nodejs";

// /app/api/glossary/backfill-candidates/route.ts

import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import {
  backfillGlossaryCandidatesForUser,
  DEFAULT_MAX_SESSIONS,
  MAX_SESSIONS_HARD_LIMIT,
} from "@/src/domain/glossary/backfillGlossaryCandidates";

type RequestBody = {
  max_sessions?: number;
  async?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = authData.user.id;
    if (!isGlossaryAdmin(userId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const requested = body.max_sessions ?? DEFAULT_MAX_SESSIONS;
    const maxSessions = Math.min(
      Math.max(1, Math.floor(requested)),
      MAX_SESSIONS_HARD_LIMIT
    );

    const result = await backfillGlossaryCandidatesForUser({
      supabase,
      userId,
      maxSessions,
      logProgress: true,
    });

    return NextResponse.json({
      ok: true,
      scanned_sessions: result.scanned,
      candidate_hits: result.candidates,
      unique_terms: result.terms,
      upserted_rows: result.upserted,
    });
  } catch (e: unknown) {
    console.error("[glossary backfill error]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
