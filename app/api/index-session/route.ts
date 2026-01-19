// /app/api/index-session/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { openaiServer, OPENAI_MODELS } from "@/src/lib/openai/server";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import {
  insertSessionIndexVersionIfMissing,
  upsertSessionIndexLatest,
} from "@/src/db/repositories/sessionIndexRepo";

type ReqBody = {
  session_id?: string;
  force?: boolean;
};

type SessionIndexPayloadV0 = {
  anchor_summary: string;
  keyphrases: string[];
  entities: {
    people: string[];
    places: string[];
    objects: string[];
  };
};

function sanitize(t: string): string {
  return (t ?? "").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const sessionId = body.session_id;
    const force = Boolean(body.force);

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    if (!force) {
      const { data: existingLatest, error: latestError } = await supabase
        .from("session_index_latest")
        .select("session_index_version_id")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (latestError) {
        return NextResponse.json({ error: latestError.message }, { status: 500 });
      }

      if (existingLatest?.session_index_version_id) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          session_index_version_id: existingLatest.session_index_version_id,
        });
      }
    }

    const { data: rawEntry, error: rawError } = await supabase
      .from("dream_entries")
      .select("content, kind, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("kind", "raw")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rawError) {
      return NextResponse.json({ error: rawError.message }, { status: 500 });
    }

    const dreamText = sanitize(rawEntry?.content ?? "");
    if (!dreamText) {
      return NextResponse.json(
        { error: "No raw dream_entries found for session" },
        { status: 400 }
      );
    }

    const openai = openaiServer();

    const sys = [
      "You create a compact, non-interpretive session index from raw dream text.",
      "Forbidden: meaning, interpretation, diagnosis, advice.",
      "Return ONLY valid JSON. No markdown.",
      "Schema:",
      JSON.stringify(
        {
          anchor_summary: "short, descriptive summary grounded in the text",
          keyphrases: ["... up to 12"],
          entities: { people: ["..."], places: ["..."], objects: ["..."] },
        },
        null,
        2
      ),
    ].join("\n");

    const indexResp = await openai.chat.completions.create({
      model: OPENAI_MODELS.OBSERVE,
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: dreamText },
      ],
      response_format: { type: "json_object" },
    });

    const indexJson = indexResp.choices[0]?.message?.content;
    if (!indexJson) {
      return NextResponse.json({ error: "Index builder: empty JSON" }, { status: 500 });
    }

    const payload = JSON.parse(indexJson) as SessionIndexPayloadV0;
    if (!payload?.anchor_summary || !Array.isArray(payload?.keyphrases)) {
      return NextResponse.json({ error: "Index builder: schema mismatch" }, { status: 500 });
    }

    const embeddingText = [
      payload.anchor_summary ?? "",
      Array.isArray(payload.keyphrases) ? payload.keyphrases.join(", ") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const embModel = OPENAI_MODELS.EMBED;
    const emb = await openai.embeddings.create({
      model: embModel,
      input: embeddingText,
    });

    const embedding = emb.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json({ error: "Embedding: missing vector" }, { status: 500 });
    }

    const input_hash = sha256(`index:v0:${sessionId}:${dreamText}`);

    const idx = await insertSessionIndexVersionIfMissing(supabase, {
      session_id: sessionId,
      user_id: userId,
      input_hash,
      payload,
      embedding_model: embModel,
      embedding,
    });

    await upsertSessionIndexLatest(supabase, {
      session_id: sessionId,
      user_id: userId,
      session_index_version_id: idx.id,
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      session_index_version_id: idx.id,
      embedding_model: embModel,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
