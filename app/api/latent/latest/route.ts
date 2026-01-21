// app/api/latent/latest/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { fetchLatentLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const latest = await fetchLatentLatestWithPayloadAndId(supabase, authData.user.id, sessionId);
    return NextResponse.json({
      latent_version_id: latest?.latent_version_id ?? null,
      payload: latest?.payload ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load latent" }, { status: 500 });
  }
}
