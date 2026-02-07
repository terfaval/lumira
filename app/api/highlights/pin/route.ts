import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { matchKeyFromLabel } from "@/src/lib/dream/huMatch";
import { normalizeKind } from "@/src/domain/highlights/aggregateSessionSuggestions";
import { countOccurrencesInText } from "@/src/domain/glossary/indexGlossaryFromHighlight";
import { upsertGlossaryOccurrences } from "@/src/db/repositories/glossaryRepo";

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
    const kind = normalizeKind(body.kind ?? "other");
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const canonicalKey = matchKeyFromLabel(label) || anchorKey(label);
    if (!canonicalKey) {
      return NextResponse.json({ error: "canonical_key_failed", message: "Nem sikerült kulcsot képezni." }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const user_id = auth.user.id;

    let termId = "";
    let termLabel = label;

    const existingRes = await supabase
      .from("glossary_terms")
      .select("id, canonical")
      .eq("user_id", user_id)
      .eq("canonical_key", canonicalKey)
      .maybeSingle();

    if (existingRes.error) {
      return NextResponse.json({ error: "db_error", message: existingRes.error.message }, { status: 500 });
    }

    if (existingRes.data?.id) {
      termId = existingRes.data.id;
      termLabel = existingRes.data.canonical ?? termLabel;
    } else {
      const insertRes = await supabase
        .from("glossary_terms")
        .insert({ user_id, canonical: label, canonical_key: canonicalKey, category: kind })
        .select("id, canonical")
        .maybeSingle();

      if (insertRes.error) {
        const retry = await supabase
          .from("glossary_terms")
          .select("id, canonical")
          .eq("user_id", user_id)
          .eq("canonical_key", canonicalKey)
          .maybeSingle();

        if (retry.error || !retry.data?.id) {
          return NextResponse.json(
            { error: "db_error", message: insertRes.error.message },
            { status: 500 }
          );
        }

        termId = retry.data.id;
        termLabel = retry.data.canonical ?? termLabel;
      } else if (insertRes.data?.id) {
        termId = insertRes.data.id;
        termLabel = insertRes.data.canonical ?? termLabel;
      }
    }

    if (!termId) {
      return NextResponse.json(
        { error: "term_create_failed", message: "Nem sikerült lexikon elemet létrehozni." },
        { status: 500 }
      );
    }

    if (note) {
      const { error: noteErr } = await supabase
        .from("glossary_notes")
        .upsert({ term_id: termId, content: note, user_id }, { onConflict: "user_id,term_id" });
      if (noteErr) {
        return NextResponse.json({ error: "db_error", message: noteErr.message }, { status: 500 });
      }
    }

    const linkRes = await supabase
      .from("dream_entry_highlights")
      .update({ glossary_term_id: termId })
      .eq("id", highlightId)
      .eq("user_id", user_id)
      .eq("session_id", sessionId)
      .select("id")
      .maybeSingle();

    if (linkRes.error) {
      return NextResponse.json({ error: "db_error", message: linkRes.error.message }, { status: 500 });
    }
    if (!linkRes.data?.id) {
      return NextResponse.json({ error: "highlight_not_found" }, { status: 404 });
    }

    const count = countOccurrencesInText(rawText, label);
    await upsertGlossaryOccurrences(supabase, {
      user_id,
      session_id: sessionId,
      rows: [{ term_id: termId, source: "user_note", count }],
    });

    await supabase.from("term_candidates").delete().eq("user_id", user_id).eq("term", canonicalKey);

    return NextResponse.json({ termId, canonical: termLabel, canonicalKey });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
