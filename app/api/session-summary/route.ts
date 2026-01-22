// app/api/session-summary/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import {
  fetchFrameLatestWithPayloadAndId,
  fetchLatentLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { CatalogService } from "@/src/services/CatalogService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerceJsonPayload(raw: any): any {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function safeSalientElements(raw: unknown): Array<{ key: string; label: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ key: string; label: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const key = typeof (item as any).key === "string" ? (item as any).key.trim() : "";
    const label = typeof (item as any).label === "string" ? (item as any).label.trim() : "";
    const text = label || key;
    if (!text) continue;
    out.push({ key: key || text, label: text });
    if (out.length >= 5) break;
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id_required", message: "Hiányzó session_id." }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized", message: "Nincs jogosultság." }, { status: 401 });
    }

    const user_id = auth.user.id;

    const sessionReq = supabase
      .from("dream_sessions")
      .select("id,title,status,created_at,updated_at")
      .eq("id", sessionId)
      .eq("user_id", user_id)
      .maybeSingle();

    const rawEntryReq = supabase
      .from("dream_entries")
      .select("content,created_at")
      .eq("session_id", sessionId)
      .eq("user_id", user_id)
      .in("kind", ["raw", "raw_entry"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const frameReq = fetchFrameLatestWithPayloadAndId(supabase, user_id, sessionId);
    const latentReq = fetchLatentLatestWithPayloadAndId(supabase, user_id, sessionId);

    const workReq = supabase
      .from("work_versions")
      .select("id,created_at,payload")
      .eq("session_id", sessionId)
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    const answersReq = supabase
      .from("dream_answers")
      .select("work_id,content,created_at")
      .eq("session_id", sessionId)
      .eq("user_id", user_id);

    const selectedReq = supabase
      .from("session_directions")
      .select("direction_slug")
      .eq("session_id", sessionId)
      .eq("user_id", user_id);

    const catalogReq = CatalogService.getActiveCatalog(supabase);

    const [
      sessionRes,
      rawEntryRes,
      frameLatest,
      latentLatest,
      workRes,
      answersRes,
      selectedRes,
      catalog,
    ] = await Promise.all([
      sessionReq,
      rawEntryReq,
      frameReq,
      latentReq,
      workReq,
      answersReq,
      selectedReq,
      catalogReq,
    ]);

    if (sessionRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Adatbázis hiba (dream_sessions).", detail: sessionRes.error.message },
        { status: 500 }
      );
    }
    if (rawEntryRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Adatbázis hiba (dream_entries).", detail: rawEntryRes.error.message },
        { status: 500 }
      );
    }
    if (workRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Adatbázis hiba (work_versions).", detail: workRes.error.message },
        { status: 500 }
      );
    }
    if (answersRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Adatbázis hiba (dream_answers).", detail: answersRes.error.message },
        { status: 500 }
      );
    }
    if (selectedRes.error) {
      return NextResponse.json(
        { error: "db_error", message: "Adatbázis hiba (session_directions).", detail: selectedRes.error.message },
        { status: 500 }
      );
    }

    const rawEntry = typeof rawEntryRes.data?.content === "string" ? rawEntryRes.data.content : null;

    let session = sessionRes.data
      ? {
          id: sessionRes.data.id,
          status: sessionRes.data.status,
          created_at: sessionRes.data.created_at,
          updated_at: sessionRes.data.updated_at,
          title_override: sessionRes.data.title ?? null,
        }
      : null;

    if (!session && rawEntryRes.data?.created_at) {
      session = {
        id: sessionId,
        status: "active",
        created_at: rawEntryRes.data.created_at,
        updated_at: rawEntryRes.data.created_at,
        title_override: null,
      };
    }

    const framePayload = coerceJsonPayload(frameLatest?.payload ?? null);
    const frame =
      framePayload && typeof framePayload === "object"
        ? {
            title: (framePayload as any).title ?? null,
            framing_text: (framePayload as any).framing_text ?? null,
            recommended_directions:
              Array.isArray((framePayload as any).recommended_directions)
                ? (framePayload as any).recommended_directions
                : Array.isArray((framePayload as any).recommended_slugs)
                ? (framePayload as any).recommended_slugs.map((slug: string) => ({ slug }))
                : null,
          }
        : null;

    const latentPayload = coerceJsonPayload(latentLatest?.payload ?? null);
    const salientElements = safeSalientElements((latentPayload as any)?.salient_elements);
    const latent = salientElements.length > 0 ? { salient_elements: salientElements } : null;

    const work_versions = (workRes.data ?? []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      payload: coerceJsonPayload(row.payload),
    }));

    const dream_answers = (answersRes.data ?? []).map((row: any) => ({
      work_id: row.work_id ?? null,
      content: row.content ?? "",
      created_at: row.created_at ?? null,
    }));

    const selected_directions = (selectedRes.data ?? [])
      .map((row: any) => row.direction_slug)
      .filter((slug: any) => typeof slug === "string");

    return NextResponse.json({
      session,
      raw_entry: rawEntry,
      frame,
      latent,
      work_versions,
      dream_answers,
      selected_directions,
      catalog: catalog ?? [],
    });
  } catch (e: any) {
    console.error("session-summary failed", e);
    return NextResponse.json(
      { error: "internal", message: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
