// /src/lib/archive.ts
import { supabase } from "@/src/lib/supabase/client";
import { isDirectionCardContent } from "./types";
import { CatalogService } from "@/src/services/CatalogService";

export type Feldolgozottsag = "vazlat" | "erintett" | "feldolgozott";
export type RangeOption = "all" | "7" | "30" | "90" | "365";
export type SortOption = "date_desc" | "date_asc" | "score_desc" | "score_asc";

export type ArchiveSessionSummary = {
  id: string;
  title: string;
  created_at: string;
  status: string;

  // snippethez
  raw_entry?: string | null;

  /**
   * touched_directions: direction slugok (belső “igazság” a work_versions alapján)
   * touched_groups: direction_catalog.content.group (UI-hoz, emberi csoportnév)
   */
  touched_directions: string[];
  touched_groups: string[];

  touched_directions_count: number;
  answered_cards_count: number;
  feldolgozottsag: Feldolgozottsag;
  score: number;
};

const rangeToDays: Record<Exclude<RangeOption, "all">, number> = {
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
};

function classifyFeldolgozottsag(touched: number, answered: number): Feldolgozottsag {
  if (touched === 0) return "vazlat";
  if (touched >= 3 && answered >= 1) return "feldolgozott";
  return "erintett";
}

function normalizeAnswer(answer: unknown): string {
  if (typeof answer !== "string") return "";
  return answer.trim();
}

function sanitizeTitle(t: string): string | null {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length > 72) return cleaned.slice(0, 69).trimEnd() + "…";
  return cleaned;
}

function isGenericTitle(t: string | null | undefined): boolean {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return !cleaned || cleaned === "álom";
}

function extractAuditTitle(audit: unknown): string | null {
  if (!audit || typeof audit !== "object") return null;

  const maybeAudit = audit as { title?: unknown };
  const rawTitle = maybeAudit.title;

  if (typeof rawTitle === "string") {
    const cleaned = sanitizeTitle(rawTitle);
    if (!cleaned) return null;
    if (cleaned.toLowerCase() === "álom") return null;
    return cleaned;
  }

  if (rawTitle && typeof rawTitle === "object" && "toString" in rawTitle) {
    const converted = sanitizeTitle(String(rawTitle));
    if (!converted) return null;
    if (converted.toLowerCase() === "álom") return null;
    return converted;
  }

  return null;
}

/**
 * ✅ preferált title forrás:
 * 1) dream_sessions.title (user override)
  * 2) frame_latest -> frame_versions.payload.title
 * 3) "Álom"
 */
function resolveTitle(params: { sessionTitle?: string | null; frameTitle?: string | null }): string {
  const sessionTitle = sanitizeTitle(params.sessionTitle ?? "");
  if (sessionTitle && !isGenericTitle(sessionTitle)) return sessionTitle;

  const frameTitle = sanitizeTitle(params.frameTitle ?? "");
  if (frameTitle && !isGenericTitle(frameTitle)) return frameTitle;

  return "?lom";
}

/** group név tisztítás */
export async function fetchArchiveSessions(userId: string, range?: RangeOption) {
  const days = range && range !== "all" ? rangeToDays[range] : undefined;
  const sinceDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  let sessionQuery = supabase
    .from("dream_sessions")
    .select(
      `
        id,
        status,
        created_at,
        title
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (sinceDate) {
    sessionQuery = sessionQuery.gte("created_at", sinceDate.toISOString());
  }

  const { data: sessions, error: sessionsError } = await sessionQuery;
  if (sessionsError) throw sessionsError;

  const sessionIds = (sessions ?? []).map((s: any) => s.id);

  const frameTitleBySession = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: latestRows } = await supabase
      .from("frame_latest")
      .select("session_id,frame_version_id")
      .eq("user_id", userId)
      .in("session_id", sessionIds);

    const frameVersionIds = (latestRows ?? [])
      .map((row: any) => row.frame_version_id)
      .filter(Boolean);

    if (frameVersionIds.length > 0) {
      const { data: frameVersions } = await supabase
        .from("frame_versions")
        .select("id,payload")
        .eq("user_id", userId)
        .in("id", frameVersionIds);

      const payloadById = new Map((frameVersions ?? []).map((row: any) => [row.id, row.payload]));

      (latestRows ?? []).forEach((row: any) => {
        const payload = payloadById.get(row.frame_version_id);
        const title = typeof payload?.title === "string" ? payload.title.trim() : "";
        if (title) frameTitleBySession.set(row.session_id, title);
      });
    }
  }

  const rawBySession = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: entries } = await supabase
      .from("dream_entries")
      .select("session_id,content,created_at")
      .eq("user_id", userId)
      .eq("kind", "raw")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    (entries ?? []).forEach((row: any) => {
      if (rawBySession.has(row.session_id)) return;
      if (typeof row.content === "string") rawBySession.set(row.session_id, row.content);
    });
  }

  let workVersions: Array<{ id: string; session_id: string; payload: any; created_at: string }> = [];
  let answersByWorkId = new Map<string, { content: string; created_at: string }>();

  if (sessionIds.length > 0) {
    const { data: versions, error: wbError } = await supabase
      .from("work_versions")
      .select("id, session_id, payload, created_at")
      .in("session_id", sessionIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (wbError) throw wbError;
    workVersions = (versions ?? []) as Array<{ id: string; session_id: string; payload: any; created_at: string }>;

    const { data: answers } = await supabase
      .from("dream_answers")
      .select("work_id, content, created_at")
      .in("session_id", sessionIds)
      .eq("user_id", userId);

    const map = new Map<string, { content: string; created_at: string }>();
    (answers ?? []).forEach((row: any) => {
      if (!row?.work_id) return;
      const existing = map.get(row.work_id);
      if (!existing) {
        map.set(row.work_id, { content: String(row.content ?? ""), created_at: row.created_at });
        return;
      }
      const existingTs = Date.parse(existing.created_at ?? "");
      const nextTs = Date.parse(row.created_at ?? "");
      if (Number.isFinite(nextTs) && (!Number.isFinite(existingTs) || nextTs >= existingTs)) {
        map.set(row.work_id, { content: String(row.content ?? ""), created_at: row.created_at });
      }
    });
    answersByWorkId = map;
  }

  const aggregates = new Map<string, { touchedSlugs: Set<string>; answeredCount: number }>();

  for (const version of workVersions) {
    const rawContent = (version as any).payload ?? null;
    if (!isDirectionCardContent(rawContent)) continue;

    const touched = aggregates.get(version.session_id) ?? {
      touchedSlugs: new Set<string>(),
      answeredCount: 0,
    };

    // ✅ work_versions-ben a “nyers igazság” a slug
    touched.touchedSlugs.add(rawContent.direction_slug);

    const answerRow = answersByWorkId.get(version.id);
    const answer = normalizeAnswer(answerRow?.content ?? "");
    if (answer.length > 0) {
      touched.answeredCount += 1;
    }

    aggregates.set(version.session_id, touched);
  }

  // ✅ slug -> group mapping a direction_catalog táblából
  const allTouchedSlugs = Array.from(aggregates.values()).flatMap((a) => Array.from(a.touchedSlugs));
  const uniqueTouchedSlugs = Array.from(new Set(allTouchedSlugs));
  const slugToGroup = await CatalogService.getGroupMapForSlugs(supabase, uniqueTouchedSlugs);

  const summaries: ArchiveSessionSummary[] = (sessions ?? []).map((session: any) => {
    const aggregate = aggregates.get(session.id) ?? {
      touchedSlugs: new Set<string>(),
      answeredCount: 0,
    };

    const touched_directions = Array.from(aggregate.touchedSlugs);
    const touched_directions_count = touched_directions.length;

    const touched_groups = Array.from(
      new Set(
        touched_directions
          .map((slug) => slugToGroup.get(slug))
          .filter((g): g is string => typeof g === "string" && g.length > 0)
      )
    );

    const answered_cards_count = aggregate.answeredCount;
    const feldolgozottsag = classifyFeldolgozottsag(touched_directions_count, answered_cards_count);
    const score = touched_directions_count * 10 + answered_cards_count;

    return {
      id: session.id,
      title: resolveTitle({
        sessionTitle: session.title ?? null,
        frameTitle: frameTitleBySession.get(session.id) ?? null,
      }),
      created_at: session.created_at,
      status: session.status,
      raw_entry: rawBySession.get(session.id) ?? null,

      touched_directions,
      touched_groups,

      touched_directions_count,
      answered_cards_count,
      feldolgozottsag,
      score,
    };
  });

  // ✅ UI-hoz group listát adunk vissza (változónév maradhat, hogy ne kelljen sok refactor)
  const availableDirections = Array.from(new Set(summaries.flatMap((s) => s.touched_groups))).sort();

  return { summaries, availableDirections };
}
