// app/api/image/generate/route.ts
import { NextResponse } from "next/server";
import { lumiraStonePassage_v0 } from "@/src/domain/image/presets/lumiraStonePassage_v0";
import { generateImage } from "@/src/domain/image/pipeline/generateImage";
import { OpenAIImageAdapter } from "@/src/domain/image/render/OpenAIImageAdapter";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await supabaseServerAuthed(req);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Auth session missing" }, { status: 401 });
  }
  const userId = authData.user.id;
  const body = await req.json().catch(() => ({}));

  const preset_id = body?.preset_id ?? "lumira_stone_passage";
  const variant = body?.variant;

  if (preset_id !== "lumira_stone_passage") {
    return NextResponse.json({ error: "Unknown preset_id" }, { status: 400 });
  }
  if (!variant || !["morning", "dawn", "night"].includes(variant)) {
    return NextResponse.json({ error: "Missing/invalid variant" }, { status: 400 });
  }

  const renderer = new OpenAIImageAdapter();

  const result = await generateImage({
    preset: lumiraStonePassage_v0,
    variant,
    user_id: userId,
    user_text: "", // v0 canonical batch: keep empty
    renderer,
  });

  return NextResponse.json(result);
}
