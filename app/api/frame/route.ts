// /app/api/frame/route.ts
//
// Wrapper-only: forward to /api/frame/ensure.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  sessionId?: string;
  session_id?: string;
};

function forwardHeaders(req: Request): Headers {
  const h = new Headers();
  const authHeader = req.headers.get("authorization");
  if (authHeader) h.set("authorization", authHeader);
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) h.set("cookie", cookieHeader);
  h.set("content-type", "application/json");
  return h;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const sessionId = typeof body.session_id === "string" ? body.session_id : body.sessionId;
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const ensureRes = await fetch(new URL("/api/frame/ensure", req.url), {
      method: "POST",
      headers: forwardHeaders(req),
      body: JSON.stringify({ session_id: sessionId }),
    });
    const ensureText = await ensureRes.text();

    return new NextResponse(ensureText, {
      status: ensureRes.status,
      headers: { "content-type": ensureRes.headers.get("content-type") ?? "application/json" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}
