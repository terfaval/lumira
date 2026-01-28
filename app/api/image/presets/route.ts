// app/api/image/presets/route.ts
import { NextResponse } from "next/server";
import { lumiraStonePassage_v0 } from "@/src/domain/image/presets/lumiraStonePassage_v0";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    presets: [
      {
        id: lumiraStonePassage_v0.id,
        version: lumiraStonePassage_v0.version,
        name: lumiraStonePassage_v0.name,
        variants: lumiraStonePassage_v0.variants.map(v => ({ key: v.key, label: v.label })),
        canvas: lumiraStonePassage_v0.canvas,
      },
    ],
  });
}
