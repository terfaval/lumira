import { NextRequest, NextResponse } from "next/server";
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

const SESSION_HIGHLIGHT_SELECT =
  "id, session_id, label, label_norm, kind, note, source, source_ref, status, created_at, updated_at";

type JsonObject = Record<string, unknown>;
type SessionHighlightSource = "user" | "suggested";
type SessionHighlightWrite = {
  label: string;
  label_norm: string;
  kind: string;
  note: string | null;
  source: SessionHighlightSource;
  source_ref: unknown;
  status: "active";
};

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

function safeJsonBody(req: NextRequest): Promise<JsonObject | null> {
  return req
    .json()
    .then((raw: unknown) => (raw && typeof raw === "object" ? (raw as JsonObject) : null))
    .catch(() => null);
}

function buildSessionHighlightWrite(body: JsonObject): SessionHighlightWrite {
  const label = String(body.label ?? "").trim();
  const noteRaw = typeof body.note === "string" ? body.note.trim() : "";

  return {
    label,
    label_norm: normalizeLabel(label),
    kind: normalizeKind(body.kind),
    note: noteRaw ? noteRaw : null,
    source: normalizeSource(body.source),
    source_ref: body.source_ref ?? null,
    status: "active",
  };
}

function getSuggestionKey(sourceRef: unknown): string | null {
  if (!sourceRef || typeof sourceRef !== "object") return null;
  const raw = (sourceRef as { suggestion_key?: unknown }).suggestion_key;
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  return key || null;
}

function mapRejectedKeys(rows: unknown[]): string[] {
  return rows
    .map((row) =>
      typeof (row as { suggestion_key?: unknown })?.suggestion_key === "string"
        ? ((row as { suggestion_key: string }).suggestion_key as string)
        : ""
    )
    .filter(Boolean);
}

async function clearRejectedSuggestion(args: {
  supabase: Awaited<ReturnType<typeof supabaseServerAuthed>>;
  sessionId: string;
  userId: string;
  suggestionKey: string;
}) {
  // Accept lifecycle cleanup: accepting a session highlight clears prior rejection memory.
  await args.supabase
    .from("dream_session_rejected_suggestions")
    .delete()
    .eq("session_id", args.sessionId)
    .eq("user_id", args.userId)
    .eq("suggestion_key", args.suggestionKey);
}

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { sessionId } = await params;
    const sessionIdValue = String(sessionId ?? "").trim();
    if (!sessionIdValue) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    // Contract: dream_session_highlights stores session-level suggestion/salience state.
    const highlightsReq = supabase
      .from("dream_session_highlights")
      .select(SESSION_HIGHLIGHT_SELECT)
      .eq("session_id", sessionIdValue)
      .eq("user_id", user_id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    const rejectedReq = supabase
      .from("dream_session_rejected_suggestions")
      .select("suggestion_key")
      .eq("session_id", sessionIdValue)
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

    const rejected_keys = mapRejectedKeys((rejectedRes.data ?? []) as unknown[]);

    return NextResponse.json({
      highlights: highlightsRes.data ?? [],
      rejected_keys,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { sessionId } = await params;
    const sessionIdValue = String(sessionId ?? "").trim();
    if (!sessionIdValue) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }

    const body = await safeJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    const write = buildSessionHighlightWrite(body);
    if (!write.label_norm) {
      return NextResponse.json({ error: "label_required" }, { status: 400 });
    }

    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;

    if (id) {
      const updateRes = await supabase
        .from("dream_session_highlights")
        .update(write)
        .eq("id", id)
        .eq("session_id", sessionIdValue)
        .eq("user_id", user_id)
        .select(SESSION_HIGHLIGHT_SELECT)
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
          session_id: sessionIdValue,
          ...write,
        },
        { onConflict: "session_id,kind,label_norm" }
      )
      .select(SESSION_HIGHLIGHT_SELECT)
      .maybeSingle();

    if (upsertRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Highlight mentés hiba.", detail: upsertRes.error.message },
        { status: 500 }
      );
    }

    const suggestionKey = getSuggestionKey(write.source_ref);
    if (suggestionKey) {
      await clearRejectedSuggestion({
        supabase,
        sessionId: sessionIdValue,
        userId: user_id,
        suggestionKey,
      });
    }

    return NextResponse.json({ highlight: upsertRes.data ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: "internal", message: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
