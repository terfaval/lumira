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
    let body: RequestBody = {};
    const rawBody = await req.text();
    if (rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody) as RequestBody;
      } catch (err) {
        return NextResponse.json({ error: "invalid json" }, { status: 400 });
      }
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
    const err = serializeError(e);
    console.error("[glossary backfill error]", err);
    return NextResponse.json({ error: err.message, name: err.name }, { status: 500 });
  }
}

function serializeError(e: unknown): {
  message: string;
  name?: string;
  stack?: string;
  raw?: string;
} {
  if (e instanceof Error) {
    const raw = safeStringify(e);
    return {
      message: e.message || "Unknown error",
      name: e.name,
      stack: e.stack,
      raw: raw && raw !== "{}" ? raw : undefined,
    };
  }
  if (e && typeof e === "object") {
    return { message: safeStringify(e), name: "NonError" };
  }
  return { message: String(e), name: "NonError" };
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_, v) => {
        if (v && typeof v === "object") {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
        }
        return v;
      },
      2
    );
  } catch {
    return String(value);
  }
}
