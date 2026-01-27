// /app/api/index-session/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import {
  insertSessionIndexVersionIfMissing,
  upsertSessionIndexLatest,
} from "@/src/db/repositories/sessionIndexRepo";
import { fetchObservationLatestV0WithPayloadAndId } from "@/src/db/repositories/latestRepo";
import { buildSessionIndexFromObservation } from "@/src/domain/index/buildSessionIndexFromObservation";

type ReqBody = {
  session_id?: string;
  force?: boolean;
  material_hash?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const sessionId = body.session_id;
    const force = Boolean(body.force);
    const materialHash = typeof body.material_hash === "string" ? body.material_hash : null;

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

    const obsLatest = await fetchObservationLatestV0WithPayloadAndId(
      supabase,
      userId,
      sessionId
    );

    if (!obsLatest?.payload || !obsLatest.observation_version_id) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "no_observation",
        session_index_version_id: null,
      });
    }

    const input_hash = materialHash
      ? sha256(`index:${materialHash}:${obsLatest.observation_version_id}`)
      : sha256(`index:v0:${sessionId}:${obsLatest.observation_version_id}`);

    const { payload, embedding, embedding_model } = await buildSessionIndexFromObservation({
      observation: obsLatest.payload,
    });

    const idx = await insertSessionIndexVersionIfMissing(supabase, {
      session_id: sessionId,
      user_id: userId,
      input_hash,
      payload,
      embedding_model,
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
      embedding_model,
      observation_version_id: obsLatest.observation_version_id,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
