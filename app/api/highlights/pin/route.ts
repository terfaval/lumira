import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { pinHighlightToLexikon } from "@/src/domain/glossary/pinHighlightToLexikon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeJsonBody(req: NextRequest): Promise<any | null> {
  return req.json().catch(() => null);
}

export async function POST(req: NextRequest) {
  try {
    const body = await safeJsonBody(req);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const sessionId = String(body.sessionId ?? "").trim();
    const highlightId = String(body.highlightId ?? "").trim();
    const label = String(body.label ?? "").replace(/\s+/g, " ").trim();
    if (!sessionId || !highlightId || !label) {
      return NextResponse.json({ error: "missing_fields", message: "Hiányzó azonosítók vagy címke." }, { status: 400 });
    }

    const rawText = typeof body.rawText === "string" ? body.rawText : null;
    const kind = body.kind ?? "other";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const user_id = auth.user.id;

    let result: { termId: string; canonicalKey: string; termLabel: string };
    try {
      result = await pinHighlightToLexikon({
        supabase,
        user_id,
        session_id: sessionId,
        rawText,
        highlight: {
          id: highlightId,
          label,
          kind,
          note,
          glossary_term_id: null,
        },
      });
    } catch (e: any) {
      const message = e?.message ?? "unknown_error";
      if (message === "missing_fields" || message === "canonical_key_failed") {
        return NextResponse.json({ error: message, message: "Hiányzó azonosítók vagy címke." }, { status: 400 });
      }
      if (message === "highlight_not_found") {
        return NextResponse.json({ error: "highlight_not_found" }, { status: 404 });
      }
      if (message === "term_create_failed") {
        return NextResponse.json(
          { error: "term_create_failed", message: "Nem sikerült lexikon elemet létrehozni." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "db_error", message }, { status: 500 });
    }

    return NextResponse.json({ termId: result.termId, canonical: result.termLabel, canonicalKey: result.canonicalKey });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
