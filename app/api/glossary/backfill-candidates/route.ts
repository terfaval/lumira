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

// NOTE: Async mode is best-effort on serverless; the runtime can freeze after response.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

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
    if (!isGlossaryAdmin(userId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const requested = body.max_sessions ?? DEFAULT_MAX_SESSIONS;
    const maxSessions = Math.min(Math.max(1, Math.floor(requested)), MAX_SESSIONS_HARD_LIMIT);

    const args = {
      supabase,
      userId,
      maxSessions,
      logProgress: true,
    };

    if (body.async) {
      void backfillGlossaryCandidatesForUser(args);
      return NextResponse.json({ ok: true, queued: true }, { status: 202 });
    }

    const result = await backfillGlossaryCandidatesForUser(args);
    return NextResponse.json({
      ok: true,
      queued: false,
      scanned_sessions: result.scanned,
      candidate_hits: result.candidates,
      unique_terms: result.terms,
      upserted_rows: result.upserted,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
