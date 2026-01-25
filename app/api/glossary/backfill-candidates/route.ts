export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("BACKFILL ROUTE HIT");
  return NextResponse.json({ ok: "route reached" });
}
