import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set([
  "person",
  "place",
  "object",
  "theme",
  "action",
  "feeling",
  "direction",
  "other",
]);

function normalizeLabel(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeKind(raw: unknown): string {
  const k = String(raw ?? "").trim().toLowerCase();
  return ALLOWED_KINDS.has(k) ? k : "other";
}

function normalizeSource(raw: unknown): "user" | "suggested" {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "suggested" ? "suggested" : "user";
}

function safeJsonBody(req: Request): Promise<any | null> {
  return req.json().catch(() => null);
}

export async function GET(req: Request, context: { params: { sessionId: string } }) {
  try {
    const sessionId = String(context?.params?.sessionId ?? "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    const highlightsReq = supabase
      .from("dream_session_highlights")
      .select("id, session_id, label, label_norm, kind, note, source, source_ref, status, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("user_id", user_id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    const rejectedReq = supabase
      .from("dream_session_rejected_suggestions")
      .select("suggestion_key")
      .eq("session_id", sessionId)
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    const [highlightsRes, rejectedRes] = await Promise.all([highlightsReq, rejectedReq]);

    if (highlightsRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Adatbázis hiba (dream_session_highlights).", detail: highlightsRes.error.message },
        { status: 500 }
      );
    }
    if (rejectedRes.error) {
      return NextResponse.json(
        {
          error: "db_error",
          message: "Adatbázis hiba (dream_session_rejected_suggestions).",
          detail: rejectedRes.error.message,
        },
        { status: 500 }
      );
    }

    const rejected_keys = (rejectedRes.data ?? [])
      .map((row: any) => (typeof row?.suggestion_key === "string" ? row.suggestion_key : ""))
      .filter(Boolean);

    return NextResponse.json({
      highlights: highlightsRes.data ?? [],
      rejected_keys,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: { sessionId: string } }) {
  try {
    const sessionId = String(context?.params?.sessionId ?? "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }

    const body = await safeJsonBody(req);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    const label = String(body.label ?? "").trim();
    const label_norm = normalizeLabel(label);
    if (!label_norm) {
      return NextResponse.json({ error: "label_required" }, { status: 400 });
    }

    const kind = normalizeKind(body.kind);
    const source = normalizeSource(body.source);
    const source_ref = body.source_ref ?? null;
    const status = "active";
    const noteRaw = typeof body.note === "string" ? body.note.trim() : "";
    const note = noteRaw ? noteRaw : null;

    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;

    if (id) {
      const updateRes = await supabase
        .from("dream_session_highlights")
        .update({ label, label_norm, kind, note, source, source_ref, status })
        .eq("id", id)
        .eq("session_id", sessionId)
        .eq("user_id", user_id)
        .select("id, session_id, label, label_norm, kind, note, source, source_ref, status, created_at, updated_at")
        .maybeSingle();

      if (updateRes.error) {
        return NextResponse.json(
          { error: "db_error", message: "Highlight frissítés hiba.", detail: updateRes.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ highlight: updateRes.data ?? null });
    }

    const upsertRes = await supabase
      .from("dream_session_highlights")
      .upsert(
        {
          user_id,
          session_id: sessionId,
          label,
          label_norm,
          kind,
          note,
          source,
          source_ref,
          status,
        },
        { onConflict: "session_id,kind,label_norm" }
      )
      .select("id, session_id, label, label_norm, kind, note, source, source_ref, status, created_at, updated_at")
      .maybeSingle();

    if (upsertRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Highlight mentés hiba.", detail: upsertRes.error.message },
        { status: 500 }
      );
    }

    const suggestionKey =
      source_ref && typeof source_ref === "object" ? (source_ref as any).suggestion_key : null;
    if (typeof suggestionKey === "string" && suggestionKey.trim()) {
      await supabase
        .from("dream_session_rejected_suggestions")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user_id)
        .eq("suggestion_key", suggestionKey.trim());
    }

    return NextResponse.json({ highlight: upsertRes.data ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
