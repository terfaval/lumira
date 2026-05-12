// app/api/admin/archetypes/backfill/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { jobBackfillArchetypeMissing } from "@/src/orchestration/jobs/jobBackfillArchetype";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BackfillBody = {
  target?: "missing_dreammap" | "missing_archetype";
  limit?: number;
  offset?: number;
  dry_run?: boolean;
  algo_version?: string;
  scope_mode?: "all" | "user" | "window";
  user_id?: string;
  since?: string;
  until?: string;
};

export async function POST(req: Request) {
  try {
    let body: BackfillBody = {};
    const rawBody = await req.text();
    if (rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody) as BackfillBody;
      } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
    }

    const supabase = await supabaseServerAuthed(req);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const adminId = auth.user.id;
    if (!isGlossaryAdmin(adminId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (body.target && body.target !== "missing_archetype") {
      return NextResponse.json(
        {
          error: "invalid_target",
          message: "This route only supports target=missing_archetype",
        },
        { status: 400 }
      );
    }

    const target = "missing_archetype" as const;
    const limit = normalizeLimit(body.limit);
    const dryRun = body.dry_run === true;
    const algoVersion =
      typeof body.algo_version === "string" && body.algo_version.trim().length > 0
        ? body.algo_version.trim()
        : "archetype_backfill_v1";
    const scopeMode = body.scope_mode ?? "all";
    const offset = normalizeOffset(body.offset);
    const scope =
      scopeMode === "user" && body.user_id
        ? { mode: "user" as const, user_id: body.user_id }
        : scopeMode === "window"
          ? {
              mode: "window" as const,
              since: body.since,
              until: body.until,
              user_id: body.user_id,
            }
          : { mode: "all" as const };

    const result = await jobBackfillArchetypeMissing({
      supabase,
      options: {
        scope,
        limit,
        offset,
        dry_run: dryRun,
        algo_version_override: algoVersion,
      },
    });

    return NextResponse.json({
      status: "ok",
      target,
      scanned: result.scanned,
      eligible: result.eligible,
      not_eligible: result.not_eligible,
      ran: result.ran,
      skipped: result.skipped,
      errors: result.errors,
      next_offset: result.next_offset,
      error_samples: result.error_samples,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "internal_error" }, { status: 500 });
  }
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined) return 25;
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 25;
  return Math.max(1, Math.floor(limit));
}

function normalizeOffset(offset?: number): number {
  if (offset === undefined) return 0;
  if (typeof offset !== "number" || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}
