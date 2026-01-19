// /app/api/session/bootstrap/route.ts
//
// One-shot bootstrap for a dream session.
// Ensures (best-effort, idempotent):
// - v0 pipeline via /api/session/ensure
//
// Goal: UI calls ONE endpoint after save.
// This endpoint forwards auth cookies/headers to internal API calls.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  session_id?: string;
  force?: boolean; // optional: forward-compatible
};

function forwardHeaders(req: Request): Record<string, string> {
  const cookie = req.headers.get("cookie") ?? "";
  const authorization = req.headers.get("authorization") ?? "";
  const h: Record<string, string> = { "content-type": "application/json" };
  if (cookie) h.cookie = cookie;
  if (authorization) h.authorization = authorization;
  return h;
}

async function safePost(req: Request, path: string, body: any) {
  const url = new URL(path, req.url).toString();
  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: forwardHeaders(req),
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    return { status: res.status, text };
  } catch (e: any) {
    return { status: 0, text: String(e?.message ?? e) };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const ensure = await safePost(req, "/api/session/ensure", { session_id: sessionId });
    try {
      const payload = ensure.text ? JSON.parse(ensure.text) : {};
      return NextResponse.json(payload, { status: ensure.status });
    } catch {
      return new NextResponse(ensure.text, { status: ensure.status });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
