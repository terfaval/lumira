// app/api/dreammap/v2/aggregate/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { fetchDreamMapV2Latest } from "@/src/db/repositories/dreamMapV2Repo";
import type { DreamMapV2Payload } from "@/src/domain/dreammap/types_v2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coercePayload(payload: any): DreamMapV2Payload | null {
  if (!payload || typeof payload !== "object") return null;
  if (payload.schema_version !== "dream_map_v2") return null;
  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return null;
  return payload as DreamMapV2Payload;
}

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    let isGuest = false;
    try {
      const { data: flags } = await supabase
        .from("user_flags")
        .select("is_guest")
        .eq("user_id", user_id)
        .maybeSingle();
      isGuest = !!flags?.is_guest;
    } catch {
      isGuest = false;
    }

    if (isGuest) {
      return NextResponse.json({ error: "guest_forbidden" }, { status: 403 });
    }

    const latest = await fetchDreamMapV2Latest(supabase, { user_id });
    if (!latest) {
      return NextResponse.json({
        status: "missing",
        meta: { computed_at: new Date().toISOString() },
        nodes: [],
        edges: [],
      });
    }

    const payload = coercePayload(latest.payload);
    if (!payload) {
      return NextResponse.json({
        status: "missing",
        meta: { computed_at: new Date().toISOString() },
        nodes: [],
        edges: [],
      });
    }

    return NextResponse.json({
      status: "ok",
      meta: {
        computed_at: new Date().toISOString(),
        node_count: payload.nodes.length,
        edge_count: payload.edges.length,
        reason: payload.meta.reason ?? null,
      },
      nodes: payload.nodes,
      edges: payload.edges,
    });
  } catch (error: any) {
    console.error("api/dreammap/v2/aggregate failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: error?.message ? String(error.message) : "Unknown error" },
      { status: 500 }
    );
  }
}
