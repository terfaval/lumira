import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    layer: "thin-route",
    timestamp: new Date().toISOString(),
  });
}
