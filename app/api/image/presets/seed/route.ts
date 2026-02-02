import { NextResponse } from "next/server";
import { supabaseServerService } from "@/src/lib/supabase/serverService";
import { lumiraStonePassage_v1 } from "@/src/domain/image/presets/lumiraStonePassage_v1"; // TODO: adjust path if different
import { lumiraGate_v2 } from "@/src/domain/image/presets/lumira_gate_v0";

export const runtime = "nodejs";

export async function POST() {
  // Dev-only safety
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const presets = [lumiraStonePassage_v1, lumiraGate_v2];

  const supabase = supabaseServerService();
  const { error } = await supabase.from("image_style_presets").upsert(
    presets.map((preset) => ({
      id: preset.id,
      version: preset.version,
      name: preset.name,
      payload: preset,
    }))
  );

  if (error) {
    return NextResponse.json({ error: `Failed to seed preset: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    presets: presets.map((preset) => ({
      preset_id: preset.id,
      preset_version: preset.version,
    })),
  });
}
