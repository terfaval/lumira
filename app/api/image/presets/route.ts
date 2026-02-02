// app/api/image/presets/route.ts
import { NextResponse } from "next/server";
import { lumiraStonePassage_v0 } from "@/src/domain/image/presets/lumiraStonePassage_v0";
import { lumiraCoreSpace_v1 } from "@/src/domain/image/presets/lumira_core_space_v1";
import type { ImageStylePreset } from "@/src/domain/image/presets/types";

export const runtime = "nodejs";

const BASE_VARIANT_KEYS = new Set(["dawn", "morning", "noon", "afternoon", "evening", "night"]);

function toPresetResponse(preset: ImageStylePreset) {
  return {
    id: preset.id,
    version: preset.version,
    name: preset.name,
    variants: preset.variants
      .filter((v) => BASE_VARIANT_KEYS.has(v.key))
      .map((v) => ({ key: v.key, label: v.label })),
    canvas: preset.canvas,
  };
}

export async function GET() {
  return NextResponse.json({
    presets: [
      toPresetResponse(lumiraStonePassage_v0),
      toPresetResponse(lumiraCoreSpace_v1),
    ],
  });
}
