// app/api/image/generate/route.ts
import { NextResponse } from "next/server";
import { lumiraStonePassage_v0 } from "@/src/domain/image/presets/lumiraStonePassage_v0";
import { generateImage } from "@/src/domain/image/pipeline/generateImage";
import { OpenAIImageAdapter } from "@/src/domain/image/render/OpenAIImageAdapter";
import { requireUserId } from "@/src/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await requireUserId(); // uses your existing auth
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
