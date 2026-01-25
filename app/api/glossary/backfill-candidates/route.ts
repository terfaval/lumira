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
  console.log("STEP 1: route reached");

  const supabase = await supabaseServerAuthed(req);

  console.log("STEP 2: supabase created");

  return NextResponse.json({ ok: "supabase ok" });
}
