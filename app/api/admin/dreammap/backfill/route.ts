// app/api/admin/dreammap/backfill/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { createDomainEvent } from "@/src/db/repositories/eventRepo";
import { jobBuildDreamMapV0 } from "@/src/orchestration/jobs/jobBuildDreamMapV0";
import { jobBackfillArchetypeMissing } from "@/src/orchestration/jobs/jobBackfillArchetype";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseAuthedClient = Awaited<ReturnType<typeof supabaseServerAuthed>>;

type BackfillBody = {
  target?: "missing_dreammap" | "missing_archetype";
  limit?: number;
  cursor?: string | null;
  offset?: number;
  dry_run?: boolean;
  algo_version?: string;
  only_missing?: boolean;
  scope_mode?: "all" | "user" | "window";
  user_id?: string;
  since?: string;
  until?: string;
};

type CursorPayload = { created_at: string; id: string };

type DreamSessionRow = {
  id: string;
  user_id: string;
  created_at: string;
  // onlyMissing esetén jön a left join mező, de nekünk itt nem kell kiolvasni
  dream_map_latest?: unknown;
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

    const supabaseAuthed = await supabaseServerAuthed(req);
    const { data: auth } = await supabaseAuthed.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const adminId = auth.user.id;
    if (!isGlossaryAdmin(adminId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const target = body.target === "missing_archetype" ? "missing_archetype" : "missing_dreammap";
    const limit = normalizeLimit(body.limit);
    const dryRun = body.dry_run === true;
    const onlyMissing = body.only_missing !== false;
    const algoVersion =
      typeof body.algo_version === "string" && body.algo_version.trim().length > 0
        ? body.algo_version.trim()
        : "dream_map_v0.4";

    if (target === "missing_archetype") {
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

      const supabase = supabaseAuthed;

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
    }

    const cursor = parseCursor(body.cursor ?? null);

    const supabase = supabaseAuthed;
    const SELECT_ALL = "id,user_id,created_at" as const;
    const SELECT_ONLY_MISSING =
      "id,user_id,created_at,dream_map_latest!left(session_id)" as const;

    let query = supabase
      .from("dream_sessions")
      .select(onlyMissing ? SELECT_ONLY_MISSING : SELECT_ALL);

    if (onlyMissing) {
      query = query.is("dream_map_latest.session_id", null);
    }

    if (cursor) {
      query = query.or(
        `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`
      );
    }

    const { data: sessions, error } = await query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: DreamSessionRow[] = (sessions ?? []) as unknown as DreamSessionRow[];

    const scanned = rows.length;

    const nextCursor =
      rows.length > 0
        ? encodeCursor({
            created_at: rows[rows.length - 1].created_at,
            id: rows[rows.length - 1].id,
          })
        : null;

    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

    const guestMap = await fetchGuestFlags(supabase, userIds);

    let built = 0;
    let skipped = 0;
    let failures = 0;
    const results: Array<{
      session_id: string;
      action: "built" | "skipped" | "failed";
      dream_map_version_id?: string | null;
      reason?: string;
    }> = [];

    for (const row of rows) {
      const session_id = row.id;
      const user_id = row.user_id;
      const isGuest = guestMap.get(user_id) === true;

      if (isGuest) {
        skipped += 1;
        results.push({ session_id, action: "skipped", reason: "guest_user" });
        continue;
      }

      if (dryRun) {
        skipped += 1;
        results.push({ session_id, action: "skipped", reason: "dry_run" });
        continue;
      }

      try {
        const event = await createDomainEvent(supabase, {
          user_id,
          session_id,
          type: "dreammap.backfill_requested",
          payload: { algo_version: algoVersion, material_hash: "backfill" },
        });

        const materialHash = `backfill:${algoVersion}:${event.id}`;

        const res = await jobBuildDreamMapV0({
          supabase,
          event: { id: event.id, user_id, session_id },
          material_hash: materialHash,
          algo_version_override: algoVersion,
        });
        
        if (res.skipped) {
          skipped += 1;
          results.push({
            session_id,
            action: "skipped",
            dream_map_version_id: res.dream_map_version_id ?? null,
            reason: "job_skipped",
          });
          continue;
        }

        if (!res.dream_map_version_id) {
          failures += 1;
          results.push({
            session_id,
            action: "failed",
            reason: "job_failed_or_missing_observation",
          });
          continue;
        }

        built += 1;
        results.push({
          session_id,
          action: "built",
          dream_map_version_id: res.dream_map_version_id,
        });
      } catch (err: any) {
        failures += 1;
        results.push({
          session_id,
          action: "failed",
          reason: err?.message ?? "unknown_error",
        });
      }
    }

    return NextResponse.json({
      status: "ok",
      scanned,
      built,
      skipped,
      failures,
      next_cursor: nextCursor,
      results,
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

function parseCursor(cursor: string | null): CursorPayload | null {
  if (!cursor) return null;
  const raw = cursor.trim();
  if (!raw) return null;

  if (raw.includes("|")) {
    const [created_at, id] = raw.split("|");
    if (created_at && id) return { created_at, id };
  }

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (parsed?.created_at && parsed?.id) {
      return { created_at: parsed.created_at, id: parsed.id };
    }
  } catch {}

  return null;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

async function fetchGuestFlags(supabase: SupabaseAuthedClient, userIds: string[]) {
  const map = new Map<string, boolean>();
  if (userIds.length === 0) return map;

  const { data } = await supabase.from("user_flags").select("user_id,is_guest").in("user_id", userIds);
  for (const row of data ?? []) {
    if (row?.user_id) {
      map.set(row.user_id as string, Boolean((row as any).is_guest));
    }
  }

  return map;
}
