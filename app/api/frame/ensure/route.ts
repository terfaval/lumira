// app/api/frame/ensure/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EnsureBody = {
  session_id: string;
  run?: {
    latent?: boolean;
    frame?: boolean;
  };
};

function forwardHeaders(req: Request): Headers {
  const h = new Headers();
  const cookie = req.headers.get("cookie");
  const authorization = req.headers.get("authorization");

  if (cookie) h.set("cookie", cookie);
  if (authorization) h.set("authorization", authorization);

  h.set("content-type", "application/json");
  return h;
}

export async function POST(req: Request) {
  // ---- auth check (fail fast, but NO business logic here)
  const supabase = await supabaseServerAuthed(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  let body: EnsureBody;
  try {
    body = (await req.json()) as EnsureBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const session_id = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!session_id) {
    return NextResponse.json({ ok: false, error: "session_id_required" }, { status: 400 });
  }

  // ---- delegate EVERYTHING to session.ensure
  const res = await fetch(new URL("/api/session/ensure", req.url), {
    method: "POST",
    headers: forwardHeaders(req),
    body: JSON.stringify({
      session_id,
      run: {
        observe: true,
        session_index: true,
        latent: body.run?.latent !== false,
        frame: body.run?.frame !== false,
      },
    }),
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
